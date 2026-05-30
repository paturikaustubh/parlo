import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { UnauthorizedError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();

  const q = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(q.get("pageSize") ?? "20", 10));

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId: payload.userId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: { userId: payload.userId } }),
  ]);

  return ok({ data: notifications, total, page, pageSize });
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();

  const updated = await prisma.notification.updateMany({
    where: { userId: payload.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return ok({ updated: updated.count });
});
