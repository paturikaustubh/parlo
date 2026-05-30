import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { ok, withErrorHandling } from "@/lib/respond";
import { getMe, updateMe } from "@/services/user.service";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();
  const user = await getMe(payload.userId);
  return ok(user);
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

  const user = await updateMe(payload.userId, result.data);
  return ok(user);
});
