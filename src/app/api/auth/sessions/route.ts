import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const sessions = await prisma.authSession.findMany({
    where: {
      userId: auth.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      authSessionId: true,
      userAgent: true,
      ipAddress: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { lastUsedAt: "desc" },
  });

  return NextResponse.json({ sessions });
}
