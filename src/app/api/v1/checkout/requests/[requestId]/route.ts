import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/errors";
import { requireAuth } from "@/lib/auth";
import {
  updateCheckoutRequest,
  getSingleCheckoutRequest,
} from "@/services/checkout.service";
import {
  findCheckoutRequestById,
  formatCheckoutRequest,
} from "@/repositories/checkout.repository";
import { prisma } from "@/lib/db";
import {
  assertFeatureEnabled,
  assertBusinessSubscriptionActive,
} from "@/lib/subscription-limits";

type Ctx = { params: Promise<{ requestId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const { requestId } = await ctx.params;
  const request = await getSingleCheckoutRequest(requestId);
  return ok(request);
});

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().optional(),
  finalAmount: z.number().optional(),
  overrideReason: z.string().optional(),
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();
  const { requestId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  // Subscription gate — resolve businessId via request → space first
  const crForGate = await findCheckoutRequestById(requestId);
  if (!crForGate)
    throw new NotFoundError(
      "CHECKOUT_REQUEST_NOT_FOUND",
      "Checkout request not found",
    );
  const spaceForGate = await prisma.space.findUnique({
    where: { id: (crForGate as any).spaceId },
    select: { businessId: true },
  });
  if (!spaceForGate)
    throw new NotFoundError("SPACE_NOT_FOUND", "Space not found.");
  await assertBusinessSubscriptionActive(spaceForGate.businessId);

  let staffDbId: number;
  let isOwner = false;
  const member = await prisma.staffMember.findFirst({
    where: { userId: payload.userId },
  });
  if (member) {
    // Verify staff belongs to the same business as the checkout request
    if (member.businessId !== spaceForGate.businessId)
      throw new ForbiddenError(
        "FORBIDDEN",
        "Checkout request not in your business",
      );
    staffDbId = member.id;
    isOwner = member.status === "OWNER";
  } else if (payload.roles.includes("OWNER")) {
    const biz = await prisma.business.findFirst({
      where: { ownerId: payload.userId },
    });
    // Verify owner's business matches the checkout request's space
    if (!biz || biz.id !== spaceForGate.businessId)
      throw new ForbiddenError(
        "FORBIDDEN",
        "Checkout request not in your business",
      );
    isOwner = true;
    staffDbId = 0;
  } else {
    throw new UnauthorizedError("Must be staff or owner");
  }

  // Staff cannot approve their own checkout request
  if (parsed.data.status === "APPROVED" && !isOwner) {
    if ((crForGate as { userId?: number | null }).userId === payload.userId) {
      throw new ForbiddenError(
        "FORBIDDEN",
        "Sorry, can't checkout yourself :)",
      );
    }
  }

  if (parsed.data.finalAmount !== undefined) {
    await assertFeatureEnabled(spaceForGate.businessId, "amountOverride");
  }

  const result = await updateCheckoutRequest(
    requestId,
    {
      status: parsed.data.status,
      reason: parsed.data.reason,
      finalAmount: parsed.data.finalAmount,
      overrideReason: parsed.data.overrideReason,
    },
    staffDbId,
    isOwner,
  );

  return ok(result);
});
