import { randomInt } from "crypto";
import { prisma } from "@/lib/db";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import {
  findCheckoutRequestById,
  formatCheckoutRequest,
} from "@/repositories/checkout.repository";
import { calculateAmount, calculateAmountFromVersion } from "./pricing.service";
import { updateSession } from "@/repositories/session.repository";
import { notifyOnDutyStaff, createNotification } from "./notification.service";
import type { CheckoutRequest } from "@/shared/types";

function generateRequestCode(): string {
  return String(randomInt(1000, 9999));
}

export async function createCheckoutRequest(
  sessionIds: string[],
  userId?: number,
): Promise<CheckoutRequest> {
  const sessions = await prisma.parkingSession.findMany({
    where: { parkingSessionId: { in: sessionIds } },
    include: {
      space: { select: { id: true, spaceId: true, businessId: true } },
    },
  });

  if (sessions.length === 0)
    throw new BadRequestError("NO_ACTIVE_SESSIONS", "No sessions found");

  const spaceIds = [...new Set(sessions.map((s) => s.spaceId))];
  if (spaceIds.length > 1)
    throw new BadRequestError(
      "MIXED_SPACES_IN_BATCH",
      "All sessions must belong to the same space",
    );

  for (const s of sessions) {
    if (s.status !== "ACTIVE")
      throw new BadRequestError(
        "SESSION_NOT_ACTIVE",
        `Session ${s.parkingSessionId} is not active`,
      );
    const existing = await prisma.checkoutRequest.findFirst({
      where: {
        sessions: { some: { parkingSessionId: s.id } },
        status: { in: ["PENDING"] },
      },
    });
    if (existing)
      throw new ConflictError(
        "CHECKOUT_ALREADY_PROCESSED",
        "A checkout request already exists for this session",
      );
  }

  const spaceDbId = sessions[0].spaceId;
  const now = new Date();
  let combinedAmountPaise = 0;

  for (const s of sessions) {
    const durationMinutes = Math.ceil(
      (now.getTime() - s.checkedInAt.getTime()) / 60000,
    );
    const amount = s.pricingVersionId
      ? await calculateAmountFromVersion(
          s.pricingVersionId,
          s.vehicleType,
          durationMinutes,
        )
      : await calculateAmount(s.spaceId, s.vehicleType, durationMinutes);
    combinedAmountPaise += amount;
    await updateSession(s.id, { amountPaise: amount });
  }

  await prisma.parkingSession.updateMany({
    where: { parkingSessionId: { in: sessionIds } },
    data: { status: "CHECKOUT_REQUESTED" },
  });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  let userDbId: number | undefined;
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    userDbId = u?.id;
  }

  const request = await prisma.checkoutRequest.create({
    data: {
      requestCode: generateRequestCode(),
      spaceId: spaceDbId,
      userId: userDbId ?? null,
      combinedAmountPaise,
      expiresAt,
      sessions: { create: sessions.map((s) => ({ parkingSessionId: s.id })) },
    },
    include: {
      sessions: {
        include: {
          parkingSession: {
            include: { space: { select: { spaceId: true, name: true } } },
          },
        },
      },
      space: { select: { spaceId: true } },
      user: { select: { userId: true } },
      approver: { select: { staffMemberId: true } },
    },
  });

  await notifyOnDutyStaff(
    spaceDbId,
    "CHECKOUT_REQUEST_NEW",
    "Checkout Request",
    `New checkout request #${request.requestCode}`,
    { checkoutRequestId: request.checkoutRequestId },
  );

  return formatCheckoutRequest(request);
}

export async function updateCheckoutRequest(
  checkoutRequestId: string,
  data: {
    status: "APPROVED" | "REJECTED";
    reason?: string;
    finalAmount?: number;
    overrideReason?: string;
  },
  staffDbId: number,
  isOwner: boolean,
): Promise<CheckoutRequest> {
  const request = await findCheckoutRequestById(checkoutRequestId);
  if (!request)
    throw new NotFoundError(
      "CHECKOUT_REQUEST_NOT_FOUND",
      "Checkout request not found",
    );
  if (request.status !== "PENDING")
    throw new ConflictError(
      "CHECKOUT_ALREADY_PROCESSED",
      "Request already processed",
    );

  const staff = await prisma.staffMember.findUnique({
    where: { id: staffDbId },
  });
  if (!staff?.isOnDuty && !isOwner)
    throw new ForbiddenError(
      "STAFF_OFF_DUTY",
      "You must be on duty to process checkout requests",
    );

  if (data.finalAmount !== undefined && !isOwner)
    throw new ForbiddenError(
      "INSUFFICIENT_ROLE",
      "Only owners can override the final amount",
    );

  if (data.status === "APPROVED") {
    const rawSessions = (
      request as unknown as { sessions: Array<{ parkingSessionId: number }> }
    ).sessions;
    const sessionIds = rawSessions.map((s) => s.parkingSessionId);
    const now = new Date();

    for (const sId of sessionIds) {
      const s = await prisma.parkingSession.findUnique({ where: { id: sId } });
      if (!s) continue;
      const durationMinutes = Math.ceil(
        (now.getTime() - s.checkedInAt.getTime()) / 60000,
      );
      await prisma.parkingSession.update({
        where: { id: sId },
        data: {
          status: "COMPLETED",
          checkedOutAt: now,
          durationMinutes,
          checkedOutByStaffId: staffDbId || null,
          ...(data.finalAmount !== undefined && {
            overrideAmountPaise: data.finalAmount,
            overrideReason: data.overrideReason,
          }),
        },
      });

      // Audit entries (fire-and-forget)
      if (staff?.userId) {
        const spaceInfo = await prisma.space
          .findUnique({
            where: { id: s.spaceId },
            select: { businessId: true },
          })
          .catch(() => null);
        if (spaceInfo) {
          const auditBase = {
            businessId: spaceInfo.businessId,
            spaceId: s.spaceId,
            actorId: staff.userId,
            entityType: "PARKING_SESSION",
            entityId: s.parkingSessionId,
          };
          prisma.auditEntry
            .create({
              data: {
                ...auditBase,
                action: "CHECK_OUT",
                metadata: { vehicleNumber: s.vehicleNumber },
              },
            })
            .catch(() => {});
          if (data.finalAmount !== undefined) {
            prisma.auditEntry
              .create({
                data: {
                  ...auditBase,
                  action: "AMOUNT_OVERRIDE",
                  metadata: {
                    original: s.amountPaise,
                    final: data.finalAmount,
                    reason: data.overrideReason,
                  },
                },
              })
              .catch(() => {});
          }
        }
      }
    }
  } else {
    const rawSessions = (
      request as unknown as { sessions: Array<{ parkingSessionId: number }> }
    ).sessions;
    const sessionIds = rawSessions.map((s) => s.parkingSessionId);
    await prisma.parkingSession.updateMany({
      where: { id: { in: sessionIds } },
      data: { status: "ACTIVE" },
    });
  }

  const updated = await prisma.checkoutRequest.update({
    where: { checkoutRequestId },
    data: {
      status: data.status,
      approvedBy: data.status === "APPROVED" ? staffDbId || null : null,
      approvedAt: data.status === "APPROVED" ? new Date() : null,
      rejectionReason: data.reason,
    },
    include: {
      sessions: {
        include: {
          parkingSession: {
            include: { space: { select: { spaceId: true, name: true } } },
          },
        },
      },
      space: { select: { spaceId: true } },
      user: { select: { userId: true } },
      approver: { select: { staffMemberId: true } },
    },
  });

  const reqUserId = (updated as unknown as { userId: number | null }).userId;
  if (reqUserId) {
    const event =
      data.status === "APPROVED"
        ? "CHECKOUT_REQUEST_APPROVED"
        : "CHECKOUT_REQUEST_REJECTED";
    await createNotification({
      userId: reqUserId,
      type: event,
      title:
        data.status === "APPROVED" ? "Checkout approved" : "Checkout rejected",
      body:
        data.status === "APPROVED"
          ? "Your checkout has been approved."
          : `Checkout rejected: ${data.reason ?? ""}`,
      data: { checkoutRequestId },
    });
  }

  return formatCheckoutRequest(updated);
}

export async function getSingleCheckoutRequest(
  requestId: string,
): Promise<CheckoutRequest> {
  const raw = await findCheckoutRequestById(requestId);
  if (!raw)
    throw new NotFoundError(
      "CHECKOUT_REQUEST_NOT_FOUND",
      "Checkout request not found",
    );
  return formatCheckoutRequest(raw);
}
