import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok, noContent } from "@/lib/respond";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { findStaffById, formatStaff } from "@/repositories/staff.repository";
import { invalidateUserSessions } from "@/services/auth.service";
import { prisma } from "@/lib/db";
import { assertBusinessSubscriptionActive } from "@/lib/subscription-limits";

type Ctx = { params: Promise<{ staffId: string }> };

const patchSchema = z.object({
  spaceId: z.string().uuid().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { staffId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const member = await findStaffById(staffId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff member not found");

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId, id: member.businessId },
  });
  if (!business)
    throw new NotFoundError(
      "NOT_FOUND",
      "Staff member not found in your business",
    );

  await assertBusinessSubscriptionActive(business.id);

  const data: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.spaceId !== undefined) {
    if (parsed.data.spaceId === null) {
      data.spaceId = null;
    } else {
      const space = await prisma.space.findUnique({
        where: { spaceId: parsed.data.spaceId },
      });
      data.spaceId = space?.id;
    }
  }

  const updated = await prisma.staffMember.update({
    where: { staffMemberId: staffId },
    data,
    include: {
      user: { select: { userId: true, name: true, phone: true } },
      business: { select: { businessId: true } },
      space: { select: { spaceId: true } },
    },
  });
  if (parsed.data.status === "INACTIVE") {
    await invalidateUserSessions(member.userId);
  }
  return ok(formatStaff(updated as Parameters<typeof formatStaff>[0]));
});

export const DELETE = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { staffId } = await ctx.params;

  const member = await findStaffById(staffId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff member not found");

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId, id: member.businessId },
  });
  if (!business)
    throw new NotFoundError(
      "NOT_FOUND",
      "Staff member not found in your business",
    );

  await assertBusinessSubscriptionActive(business.id);

  await prisma.staffMember.update({
    where: { staffMemberId: staffId },
    data: { status: "REMOVED" },
  });
  await invalidateUserSessions(member.userId);
  return noContent();
});
