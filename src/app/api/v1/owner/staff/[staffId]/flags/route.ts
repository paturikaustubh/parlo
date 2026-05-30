import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { findStaffById } from "@/repositories/staff.repository";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ staffId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { staffId } = await ctx.params;

  const member = await findStaffById(staffId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff member not found");

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId, id: member.businessId },
  });
  if (!business)
    throw new NotFoundError("NOT_FOUND", "Staff member not in your business");

  const flags = await prisma.staffFlag.findMany({
    where: { staffMemberId: member.id },
    orderBy: { createdAt: "desc" },
  });

  return ok(
    flags.map((f) => ({
      staffFlagId: f.staffFlagId,
      type: f.type,
      description: f.description,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      resolvedAt: f.resolvedAt?.toISOString() ?? null,
    })),
  );
});
