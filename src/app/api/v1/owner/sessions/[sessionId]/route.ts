import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  findSessionById,
  formatSession,
} from "@/repositories/session.repository";

type Ctx = { params: Promise<{ sessionId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { sessionId } = await ctx.params;

  const session = await findSessionById(sessionId);
  if (!session)
    throw new NotFoundError("SESSION_NOT_FOUND", "Session not found");

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId },
    select: { id: true },
  });
  const space = await prisma.space.findUnique({
    where: { id: session.spaceId },
    select: { businessId: true },
  });
  if (!business || space?.businessId !== business.id)
    throw new ForbiddenError("FORBIDDEN", "Session not in your business");

  const formatted = formatSession(session as any);
  return ok({
    ...formatted,
    vehicleId: session.vehicle?.vehicleId ?? null,
    userId: session.user?.userId ?? null,
  });
});
