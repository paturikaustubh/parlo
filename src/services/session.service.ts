import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from "@/lib/errors";
import { consumeActionSession } from "./qr.service";
import { calculateAmount, calculateAmountFromVersion } from "./pricing.service";
import {
  createSession,
  updateSession,
  findSessionById,
  listSessions,
  formatSession,
} from "@/repositories/session.repository";
import type { ParkingSession, VehicleType } from "@/shared/types";

function enrichSession(
  s: Awaited<ReturnType<typeof findSessionById>>,
): ParkingSession {
  if (!s) throw new NotFoundError("SESSION_NOT_FOUND", "Session not found");
  return {
    ...formatSession(s),
    vehicleId: s.vehicle?.vehicleId ?? null,
    userId: s.user?.userId ?? null,
    checkedInByStaffId: s.checkedInBy?.staffMemberId ?? null,
    checkedOutByStaffId: s.checkedOutBy?.staffMemberId ?? null,
  };
}

export async function checkIn(data: {
  actionSessionId: string;
  vehicleId?: string;
  guestName?: string;
  guestPhone?: string;
  guestVehicleType?: VehicleType;
  guestVehicleNumber?: string;
  userId?: number;
}): Promise<ParkingSession> {
  const { spaceDbId } = await consumeActionSession(data.actionSessionId);

  const spaceData = await prisma.space.findUnique({
    where: { id: spaceDbId },
    select: { currentPricingVersionId: true, businessId: true },
  });

  let vehicleDbId: number | undefined;
  let vehicleNumber: string;
  let vehicleType: string;

  if (data.vehicleId) {
    const v = await prisma.vehicle.findUnique({
      where: { vehicleId: data.vehicleId },
    });
    if (!v) throw new NotFoundError("NOT_FOUND", "Vehicle not found");

    const active = await prisma.parkingSession.findFirst({
      where: { vehicleId: v.id, status: "ACTIVE" },
    });
    if (active)
      throw new ConflictError(
        "VEHICLE_ALREADY_PARKED",
        "This vehicle already has an active session",
      );

    vehicleDbId = v.id;
    vehicleNumber = v.vehicleNumber;
    vehicleType = v.vehicleType;
  } else {
    if (!data.guestVehicleNumber || !data.guestVehicleType) {
      throw new BadRequestError(
        "VALIDATION_ERROR",
        "Guest check-in requires vehicleNumber and vehicleType",
      );
    }
    vehicleNumber = data.guestVehicleNumber;
    vehicleType = data.guestVehicleType;
  }

  const s = await createSession({
    spaceId: spaceDbId,
    vehicleId: vehicleDbId,
    vehicleNumber,
    vehicleType,
    guestName: data.guestName,
    guestPhone: data.guestPhone,
    tokenId: !data.userId
      ? randomBytes(4).toString("hex").toUpperCase()
      : undefined,
    isOnBehalf: false,
    userId: data.userId,
    pricingVersionId: spaceData?.currentPricingVersionId ?? undefined,
  });

  // Audit entry (fire-and-forget)
  if (data.userId && spaceData?.businessId) {
    prisma.auditEntry
      .create({
        data: {
          businessId: spaceData.businessId,
          spaceId: spaceDbId,
          actorId: data.userId,
          action: "CHECK_IN",
          entityType: "PARKING_SESSION",
          entityId: s.parkingSessionId,
          metadata: { vehicleNumber },
        },
      })
      .catch(() => {});
  }

  return enrichSession(s);
}

export async function staffOnBehalfCheckIn(data: {
  spaceId: string;
  name: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  staffDbId: number;
}): Promise<{ session: ParkingSession; tokenId: string }> {
  const space = await prisma.space.findUnique({
    where: { spaceId: data.spaceId },
    select: { id: true, businessId: true, currentPricingVersionId: true },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  const tokenId = randomBytes(4).toString("hex").toUpperCase();

  const s = await createSession({
    spaceId: space.id,
    vehicleNumber: data.vehicleNumber.toUpperCase(),
    vehicleType: data.vehicleType,
    guestName: data.name,
    guestPhone: data.phone,
    tokenId,
    isOnBehalf: true,
    checkedInByStaffId: data.staffDbId,
    pricingVersionId: space.currentPricingVersionId ?? undefined,
  });

  // Audit entry (fire-and-forget)
  if (space) {
    prisma.staffMember
      .findUnique({ where: { id: data.staffDbId }, select: { userId: true } })
      .then(
        (sm) =>
          sm &&
          prisma.auditEntry.create({
            data: {
              businessId: space.businessId,
              spaceId: space.id,
              actorId: sm.userId,
              action: "CHECK_IN",
              entityType: "PARKING_SESSION",
              entityId: s.parkingSessionId,
              metadata: {
                vehicleNumber: data.vehicleNumber,
                guestName: data.name,
              },
            },
          }),
      )
      .catch(() => {});
  }

  return { session: enrichSession(s), tokenId };
}

export async function getSession(
  parkingSessionId: string,
  requesterId?: number,
): Promise<ParkingSession> {
  const s = await findSessionById(parkingSessionId);
  if (!s) throw new NotFoundError("SESSION_NOT_FOUND", "Session not found");
  if (requesterId && s.userId !== null && s.userId !== requesterId) {
    throw new ForbiddenError("FORBIDDEN", "Access denied");
  }
  return enrichSession(s);
}

export async function getSessions(filters: {
  userId?: number;
  spaceId?: number;
  status?: string;
  guestPhone?: string;
  tokenId?: string;
  page: number;
  pageSize: number;
  search?: string;
  from?: string;
  to?: string;
}) {
  const { sessions, total } = await listSessions(filters);
  const now = new Date();

  const data = await Promise.all(
    sessions.map(async (s) => {
      const base = enrichSession(s);
      if (s.status === "ACTIVE") {
        const durationMinutes = Math.ceil(
          (now.getTime() - s.checkedInAt.getTime()) / 60000,
        );
        const estimatedAmountPaise = s.pricingVersionId
          ? await calculateAmountFromVersion(
              s.pricingVersionId,
              s.vehicleType,
              durationMinutes,
            )
          : await calculateAmount(s.spaceId, s.vehicleType, durationMinutes);
        return { ...base, estimatedAmountPaise };
      }
      return base;
    }),
  );

  return { data, total, page: filters.page, pageSize: filters.pageSize };
}

export async function closeSession(
  parkingSessionId: string,
  staffDbId?: number,
): Promise<ParkingSession> {
  const s = await findSessionById(parkingSessionId);
  if (!s) throw new NotFoundError("SESSION_NOT_FOUND", "Session not found");
  if (s.status !== "ACTIVE" && s.status !== "CHECKOUT_REQUESTED") {
    throw new BadRequestError("SESSION_NOT_ACTIVE", "Session is not active");
  }

  const now = new Date();
  const durationMinutes = Math.ceil(
    (now.getTime() - s.checkedInAt.getTime()) / 60000,
  );
  const amountPaise = s.pricingVersionId
    ? await calculateAmountFromVersion(
        s.pricingVersionId,
        s.vehicleType,
        durationMinutes,
      )
    : await calculateAmount(s.spaceId, s.vehicleType, durationMinutes);

  const updated = await updateSession(s.id, {
    status: "COMPLETED",
    checkedOutAt: now,
    durationMinutes,
    amountPaise,
    checkedOutByStaffId: staffDbId,
  });

  return enrichSession(updated);
}
