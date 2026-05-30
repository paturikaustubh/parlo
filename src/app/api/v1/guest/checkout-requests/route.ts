import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, created } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { createCheckoutRequest } from "@/services/checkout.service";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    throw new ValidationError({ sessionId: "valid UUID required" });

  const request = await createCheckoutRequest(
    [parsed.data.sessionId],
    undefined,
  );
  return created(request);
});
