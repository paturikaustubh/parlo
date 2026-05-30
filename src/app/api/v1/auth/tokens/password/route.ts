import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { signInWithPassword } from "@/services/auth.service";

const schema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/),
  password: z.string().min(8).max(72),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const result = await signInWithPassword(
    parsed.data.phone,
    parsed.data.password,
  );
  return ok(result);
});
