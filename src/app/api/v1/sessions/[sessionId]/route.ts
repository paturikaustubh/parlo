import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
} from "@/lib/errors";
import { requireAuth } from "@/lib/auth";
import { getSession, closeSession } from "@/services/session.service";
import { prisma } from "@/lib/db";
import { assertBusinessSubscriptionActive } from "@/lib/subscription-limits";

type Ctx = { params: Promise<{ sessionId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireAuth(req);
  const { sessionId } = await ctx.params;
  const session = await getSession(sessionId, payload?.userId);
  return ok(session);
});

const patchSchema = z.object({ status: z.literal("COMPLETED") });

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();
  const { sessionId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  let staffDbId: number | undefined;
  if (payload.roles.includes("STAFF") || payload.roles.includes("OWNER")) {
    const member = await prisma.staffMember.findFirst({
      where: { userId: payload.userId, status: "ACTIVE" },
    });
    staffDbId = member?.id;
  }

  // Resolve businessId via session → space
  const sessionRecord = await prisma.parkingSession.findUnique({
    where: { parkingSessionId: sessionId },
    include: { space: { select: { businessId: true } } },
  });
  if (!sessionRecord) throw new NotFoundError("NOT_FOUND", "Session not found");
  await assertBusinessSubscriptionActive(sessionRecord.space.businessId);

  const session = await closeSession(sessionId, staffDbId);
  return ok(session);
});
