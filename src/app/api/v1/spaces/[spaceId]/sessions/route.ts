import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { listSessions, formatSession } from "@/repositories/session.repository";
import { findUserById } from "@/repositories/user.repository";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ spaceId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireRole(req, "OWNER");
  const { spaceId } = await ctx.params;

  const space = await prisma.space.findUnique({
    where: { spaceId },
    select: { id: true },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  const q = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(q.get("pageSize") ?? "20", 10));
  const status = q.get("status") ?? undefined;

  const { sessions, total } = await listSessions({
    spaceId: space.id,
    status,
    page,
    pageSize,
  });
  const data = await Promise.all(
    sessions.map(async (s) => {
      const base = formatSession(s);
      return {
        ...base,
        vehicleId: s.vehicle?.vehicleId ?? null,
        userId: s.user?.userId ?? null,
      };
    }),
  );
  return ok({ data, total, page, pageSize });
});
