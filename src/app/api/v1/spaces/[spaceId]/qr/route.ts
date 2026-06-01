import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/respond";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { getOrRotateQr } from "@/services/qr.service";
import { assertBusinessSubscriptionActive } from "@/lib/subscription-limits";

type Ctx = { params: Promise<{ spaceId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "STAFF", "OWNER");

  const { spaceId } = await ctx.params;

  const space = await prisma.space.findUnique({ where: { spaceId } });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  await assertBusinessSubscriptionActive(space.businessId);

  const isOwner = payload.roles.includes("OWNER");
  if (!isOwner) {
    const member = await prisma.staffMember.findFirst({
      where: {
        userId: payload.userId,
        status: "ACTIVE",
        businessId: space.businessId,
      },
      select: { isOnDuty: true },
    });
    if (!member?.isOnDuty) {
      throw new ForbiddenError(
        "OFF_DUTY",
        "You must be on duty to perform this action",
      );
    }
  }

  const qr = await getOrRotateQr(space.id);
  return ok(qr);
});
