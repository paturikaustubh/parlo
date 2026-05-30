import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ businessId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireRole(req, "OWNER", "VERIFIER");
  const { businessId } = await ctx.params;

  const business = await prisma.business.findUnique({ where: { businessId } });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "Business not found");

  const subscription = await prisma.businessSubscription.findUnique({
    where: { businessId: business.id },
    include: { plan: true },
  });
  if (!subscription)
    throw new NotFoundError("NO_SUBSCRIPTION", "No subscription found");

  const [spacesUsed, staffUsed] = await prisma.$transaction([
    prisma.space.count({ where: { businessId: business.id, isActive: true } }),
    prisma.staffMember.count({
      where: { businessId: business.id, status: "ACTIVE" },
    }),
  ]);

  return ok({
    subscription,
    plan: subscription.plan,
    usage: { spacesUsed, staffUsed },
  });
});
