import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok, created } from "@/lib/respond";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  planId: z.string().uuid(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  notes: z.string().optional(),
  paymentProofUrl: z.string().optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId, deletedAt: null },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "No business found");

  const plan = await prisma.plan.findUnique({
    where: { planId: parsed.data.planId },
  });
  if (!plan || !plan.isActive)
    throw new NotFoundError("INVALID_PLAN", "Plan not found or inactive");

  const pending = await prisma.subscriptionRequest.findFirst({
    where: { businessId: business.id, status: "PENDING" },
  });
  if (pending)
    throw new ConflictError(
      "REQUEST_ALREADY_PENDING",
      "A pending request already exists",
    );

  const request = await prisma.subscriptionRequest.create({
    data: {
      businessId: business.id,
      planId: plan.id,
      requestedBy: payload.userId,
      billingCycle: parsed.data.billingCycle,
      notes: parsed.data.notes,
      paymentProofUrl: parsed.data.paymentProofUrl ?? null,
    },
    include: { plan: { select: { planId: true, name: true, slug: true } } },
  });
  return created(request);
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId, deletedAt: null },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "No business found");

  const requests = await prisma.subscriptionRequest.findMany({
    where: { businessId: business.id },
    include: { plan: { select: { planId: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok({ data: requests });
});
