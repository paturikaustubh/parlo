import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/respond";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ spaceId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER", "STAFF");

  const { spaceId } = await ctx.params;
  const space = await prisma.space.findUnique({
    where: { spaceId },
    include: { business: { select: { ownerId: true } } },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  const isOwner = space.business.ownerId === payload.userId;
  if (!isOwner) {
    const member = await prisma.staffMember.findFirst({
      where: { userId: payload.userId, businessId: space.businessId },
    });
    if (!member) throw new ForbiddenError("FORBIDDEN", "Not your space");
  }

  const [currentlyParked, onDutyStaff, activeRequests] = await Promise.all([
    prisma.parkingSession.count({
      where: { spaceId: space.id, status: "ACTIVE" },
    }),
    prisma.staffMember.count({ where: { spaceId: space.id, isOnDuty: true } }),
    prisma.checkoutRequest.count({
      where: { spaceId: space.id, status: "PENDING" },
    }),
  ]);

  const byTypeRaw = await prisma.parkingSession.groupBy({
    by: ["vehicleType"],
    where: {
      spaceId: space.id,
      status: { in: ["ACTIVE", "CHECKOUT_REQUESTED"] },
    },
    _count: { vehicleType: true },
  });
  const byType: Record<string, number> = Object.fromEntries(
    byTypeRaw.map((r) => [r.vehicleType, r._count.vehicleType]),
  );

  return ok({ currentlyParked, onDutyStaff, activeRequests, byType });
});
