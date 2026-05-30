import type { NextRequest } from "next/server";
import { z } from "zod";
import { created, withErrorHandling } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { createActionSession } from "@/services/qr.service";

const postSchema = z.object({
  uuid: z.string().uuid(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const result = postSchema.safeParse(body);
  if (!result.success) {
    const details = Object.fromEntries(
      result.error.issues.map((i) => [i.path.join("."), i.message]),
    );
    throw new ValidationError(details);
  }

  const session = await createActionSession(result.data.uuid);
  return created(session);
});
