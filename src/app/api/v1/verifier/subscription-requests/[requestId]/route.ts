import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import { ValidationError, NotFoundError, BadRequestError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ requestId: string }> };

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "VERIFIER");
  const { requestId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const request = await prisma.subscriptionRequest.findUnique({
    where: { subscriptionRequestId: requestId },
  });
  if (!request)
    throw new NotFoundError("NOT_FOUND", "Subscription request not found");

  if (parsed.data.status === "APPROVED" && request.linkId) {
    const linkedReg = await prisma.businessRegistration.findFirst({
      where: { linkId: request.linkId },
      select: { status: true },
    });
    if (linkedReg && linkedReg.status !== "APPROVED") {
      throw new BadRequestError(
        "REGISTRATION_NOT_APPROVED",
        "Approve the business registration first",
      );
    }
  }

  if (parsed.data.status === "APPROVED") {
    const business = await prisma.business.findUnique({
      where: { id: request.businessId },
    });
    if (!business)
      throw new NotFoundError("BUSINESS_NOT_FOUND", "Business not found");

    const plan = await prisma.plan.findUnique({
      where: { id: request.planId },
    });
    if (!plan) throw new NotFoundError("INVALID_PLAN", "Plan not found");

    const now = new Date();
    const expiresAt = new Date(now);
    if (request.billingCycle === "MONTHLY")
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await prisma.businessSubscription.upsert({
      where: { businessId: request.businessId },
      create: {
        businessId: request.businessId,
        planId: request.planId,
        status: "ACTIVE",
        billingCycle: request.billingCycle,
        startsAt: now,
        expiresAt,
        activatedBy: payload.userId,
        activatedAt: now,
      },
      update: {
        planId: request.planId,
        status: "ACTIVE",
        billingCycle: request.billingCycle,
        startsAt: now,
        expiresAt,
        activatedBy: payload.userId,
        activatedAt: now,
      },
    });
  }

  const updated = await prisma.subscriptionRequest.update({
    where: { subscriptionRequestId: requestId },
    data: {
      status: parsed.data.status,
      reviewNotes: parsed.data.notes,
      reviewedBy: payload.userId,
      reviewedAt: new Date(),
    },
    include: { plan: { select: { planId: true, name: true, slug: true } } },
  });

  return ok(updated);
});
