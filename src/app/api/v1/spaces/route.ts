import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok, created } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { listSpaces, createSpace } from "@/services/space.service";

const schema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  spaceType: z.string().max(100).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");
  return ok(await listSpaces(payload.userId));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});
  return created(await createSpace(payload.userId, parsed.data));
});
