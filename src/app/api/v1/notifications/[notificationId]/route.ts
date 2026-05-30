import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { UnauthorizedError, NotFoundError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ notificationId: string }> };

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();
  const { notificationId } = await ctx.params;

  const n = await prisma.notification.findFirst({
    where: { notificationId, userId: payload.userId },
  });
  if (!n) throw new NotFoundError("NOT_FOUND", "Notification not found");

  const updated = await prisma.notification.update({
    where: { notificationId },
    data: { readAt: new Date() },
  });
  return ok(updated);
});
