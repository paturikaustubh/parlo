import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { listSessions, formatSession } from "@/repositories/session.repository";
import {
  calculateAmount,
  calculateAmountFromVersion,
} from "@/services/pricing.service";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");
  const q = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(q.get("pageSize") ?? "20", 10));
  const status = q.get("status") ?? undefined;
  const search = q.get("search") ?? undefined;
  const from = q.get("from") ?? undefined;
  const to = q.get("to") ?? undefined;

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId },
    select: { id: true },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "No business found");

  const businessSpaces = await prisma.space.findMany({
    where: { businessId: business.id },
    select: { id: true },
  });
  const businessSpaceIds = businessSpaces.map((s) => s.id);

  let spaceDbId: number | undefined;
  const spaceId = q.get("spaceId");
  if (spaceId) {
    const space = await prisma.space.findUnique({
      where: { spaceId },
      select: { id: true },
    });
    // Only use this space if it belongs to this business
    if (space && businessSpaceIds.includes(space.id)) {
      spaceDbId = space.id;
    }
  }

  const result = await listSessions({
    spaceId: spaceDbId,
    spaceIds: spaceDbId ? undefined : businessSpaceIds,
    status,
    search,
    from,
    to,
    page,
    pageSize,
  });

  const now = Date.now();
  const data = await Promise.all(
    result.sessions.map(async (s) => {
      const formatted = formatSession(s as any);
      const base = {
        ...formatted,
        vehicleId: s.vehicle?.vehicleId ?? null,
        userId: s.user?.userId ?? null,
      };

      if (s.status === "ACTIVE" || s.status === "CHECKOUT_REQUESTED") {
        const durationMinutes = Math.max(
          0,
          Math.floor((now - s.checkedInAt.getTime()) / 60000),
        );
        const pricingVersionId = (s as any).pricingVersionId as number | null;
        const estimatedAmountPaise = pricingVersionId
          ? await calculateAmountFromVersion(
              pricingVersionId,
              s.vehicleType,
              durationMinutes,
            )
          : await calculateAmount(s.spaceId, s.vehicleType, durationMinutes);

        return { ...base, estimatedAmountPaise };
      }

      return base;
    }),
  );

  return ok({
    data,
    total: result.total,
    page,
    pageSize,
    lastPage: Math.ceil(result.total / pageSize) || 1,
    nextCursor: null,
  });
});
