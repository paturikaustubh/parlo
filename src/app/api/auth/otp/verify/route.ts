import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { issueToken } from "@/lib/token";

const bodySchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/),
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { phone, otp } = parsed.data;

  const storedOtp = await redis.get(`otp:${phone}`);
  if (!storedOtp || String(storedOtp) !== otp) {
    return NextResponse.json({ error: "INVALID_OTP" }, { status: 401 });
  }

  await redis.del(`otp:${phone}`);

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) {
    await redis.setex(`otp:verified:${phone}`, 15 * 60, "1");
    return NextResponse.json({ status: "USER_NOT_FOUND" });
  }

  if (!user.isActive) {
    return NextResponse.json({ error: "ACCOUNT_DISABLED" }, { status: 403 });
  }

  const roles = user.userRoles.map((ur) => ur.role.code);
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const ipAddress =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    undefined;
  const token = await issueToken(user.id, roles, userAgent, ipAddress);

  return NextResponse.json({
    status: "OK",
    token,
    user: { userId: user.userId, name: user.name, roles },
  });
}
