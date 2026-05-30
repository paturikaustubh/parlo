import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, created } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { verifyOtpForSignin } from "@/services/auth.service";

const schema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/),
  otp: z.string().length(6),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const result = await verifyOtpForSignin(parsed.data.phone, parsed.data.otp);
  return created(result);
});
