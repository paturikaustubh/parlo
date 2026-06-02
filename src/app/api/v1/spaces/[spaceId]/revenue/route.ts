import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/respond";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ spaceId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");

  const { spaceId } = await ctx.params;
  const space = await prisma.space.findUnique({
    where: { spaceId },
    include: { business: { select: { ownerId: true } } },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");
  if (space.business.ownerId !== payload.userId)
    throw new ForbiddenError("FORBIDDEN", "Not your space");

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  if (
    (fromParam && isNaN(from!.getTime())) ||
    (toParam && isNaN(to!.getTime()))
  ) {
    throw new ValidationError({ range: "Invalid date" });
  }

  const where = {
    spaceId: space.id,
    status: "COMPLETED",
    ...(from || to
      ? { checkedOutAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : {}),
  };

  const sessions = await prisma.parkingSession.findMany({
    where,
    select: { amountPaise: true, overrideAmountPaise: true },
  });

  const revenuePaise = sessions.reduce(
    (sum, s) => sum + (s.overrideAmountPaise ?? s.amountPaise ?? 0),
    0,
  );

  return ok({ revenuePaise, sessionCount: sessions.length });
});
