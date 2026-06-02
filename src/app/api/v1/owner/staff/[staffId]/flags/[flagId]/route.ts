import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { findStaffById } from "@/repositories/staff.repository";
import { prisma } from "@/lib/db";
import { assertBusinessSubscriptionActive } from "@/lib/subscription-limits";

type Ctx = { params: Promise<{ staffId: string; flagId: string }> };

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { staffId, flagId } = await ctx.params;

  const member = await findStaffById(staffId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff member not found");

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId, id: member.businessId },
  });
  if (!business)
    throw new NotFoundError("NOT_FOUND", "Staff member not in your business");

  await assertBusinessSubscriptionActive(business.id);

  const body = await req.json().catch(() => null);
  if (body?.status !== "RESOLVED")
    throw new ValidationError({ status: "must be RESOLVED" });

  const flag = await prisma.staffFlag.update({
    where: { staffFlagId: flagId },
    data: {
      status: "RESOLVED",
      resolvedBy: payload.userId,
      resolvedAt: new Date(),
    },
  });

  return ok({
    staffFlagId: flag.staffFlagId,
    status: flag.status,
    resolvedAt: flag.resolvedAt?.toISOString(),
  });
});
