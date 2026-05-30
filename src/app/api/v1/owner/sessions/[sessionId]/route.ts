import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
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

  const formatted = formatSession(session as any);
  return ok({
    ...formatted,
    vehicleId: session.vehicle?.vehicleId ?? null,
    userId: session.user?.userId ?? null,
  });
});
