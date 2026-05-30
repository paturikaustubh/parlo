import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { sendOtp } from "@/services/auth.service";

const schema = z.object({ phone: z.string().regex(/^\+91\d{10}$/) });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new ValidationError({ phone: "Must be +91 followed by 10 digits" });

  await sendOtp(parsed.data.phone);
  return ok({ message: "OTP sent", expiresInSeconds: 600 });
});
