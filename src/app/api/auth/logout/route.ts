import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const token = req.headers.get("authorization")!.slice(7).trim();
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await Promise.all([
    redis.del(`auth:token:${token}`),
    prisma.authSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Logged out" });
}
