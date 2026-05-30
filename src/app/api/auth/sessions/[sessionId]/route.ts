import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/auth/sessions/[sessionId]">,
) {
  const auth = await requireAuth(req);
  if (!auth)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { sessionId } = await ctx.params;

  const session = await prisma.authSession.findFirst({
    where: { authSessionId: sessionId, userId: auth.userId, revokedAt: null },
  });

  if (!session) {
    return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  await prisma.authSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  // Note: Redis key expires naturally after TTL (raw token not stored in DB by design)
  return NextResponse.json({ message: "Session revoked" });
}
