import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { noContent, withErrorHandling } from "@/lib/respond";
import { setPassword, invalidateUserSessions } from "@/services/auth.service";
import { z } from "zod";

const patchSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(72),
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();

  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    const details = Object.fromEntries(
      result.error.issues.map((i) => [i.path.join("."), i.message]),
    );
    throw new ValidationError(details);
  }

  await setPassword(
    payload.userId,
    result.data.currentPassword,
    result.data.newPassword,
  );
  await invalidateUserSessions(payload.userId);
  return noContent();
});
