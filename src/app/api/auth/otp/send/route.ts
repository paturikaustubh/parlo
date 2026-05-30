import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";

const OTP_TTL = 10 * 60; // 10 minutes

const bodySchema = z.object({
  phone: z
    .string()
    .regex(/^\+91\d{10}$/, "Phone must be +91 followed by 10 digits"),
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

  const { phone } = parsed.data;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await redis.setex(`otp:${phone}`, OTP_TTL, otp);

  // TODO: Integrate SMS provider (MSG91, Twilio, etc.)
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV OTP] ${phone} → ${otp}`);
  }

  return NextResponse.json({ message: "OTP sent" });
}
