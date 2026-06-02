import { NextRequest } from "next/server";
import { withErrorHandling, ok, created } from "@/lib/respond";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth";
import { createCheckoutRequest } from "@/services/checkout.service";
import {
  formatCheckoutRequest,
  listCheckoutRequests,
} from "@/repositories/checkout.repository";
import { prisma } from "@/lib/db";
import { assertBusinessSubscriptionActive } from "@/lib/subscription-limits";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  const body = await req.json().catch(() => null);
  const sessionIds = body?.sessionIds;

  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    throw new ValidationError({ sessionIds: "array of UUIDs required" });
  }

  // Resolve businessId from first session for subscription gate
  const firstSession = await prisma.parkingSession.findFirst({
    where: { parkingSessionId: sessionIds[0] },
    include: { space: { select: { businessId: true } } },
  });
  if (!firstSession?.space?.businessId) {
    throw new NotFoundError(
      "SESSION_NOT_FOUND",
      "Session not found or has no associated space.",
    );
  }
  await assertBusinessSubscriptionActive(firstSession.space.businessId);

  const request = await createCheckoutRequest(sessionIds, payload?.userId);
  return created(request);
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  const q = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(q.get("pageSize") ?? "20", 10));
  const status = q.get("status") ?? undefined;

  let spaceDbIds: number[] = [];
  const spaceId = q.get("spaceId");

  if (
    payload &&
    (payload.roles.includes("STAFF") || payload.roles.includes("OWNER"))
  ) {
    if (spaceId) {
      const space = await prisma.space.findUnique({
        where: { spaceId },
        select: { id: true },
      });
      if (space) spaceDbIds = [space.id];
    } else if (payload.roles.includes("OWNER")) {
      const ownerBiz = await prisma.business.findFirst({
        where: { ownerId: payload.userId },
      });
      if (ownerBiz) {
        const spaces = await prisma.space.findMany({
          where: { businessId: ownerBiz.id },
          select: { id: true },
        });
        spaceDbIds = spaces.map((s) => s.id);
      }
    } else {
      const member = await prisma.staffMember.findFirst({
        where: { userId: payload.userId, status: "ACTIVE" },
      });
      if (member?.spaceId) spaceDbIds = [member.spaceId];
    }
  }

  const { requests, total } = await listCheckoutRequests({
    spaceIds: spaceDbIds,
    status,
    page,
    pageSize,
  });
  return ok({
    data: requests.map(formatCheckoutRequest),
    total,
    page,
    pageSize,
    lastPage: Math.ceil(total / pageSize) || 1,
    nextCursor: null,
  });
});
