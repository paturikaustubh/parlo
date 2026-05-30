import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { getSpace, updateSpace, deleteSpace } from "@/services/space.service";

type Ctx = { params: Promise<{ spaceId: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional(),
  spaceType: z.string().max(100).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireRole(req, "STAFF", "OWNER");
  const { spaceId } = await ctx.params;
  return ok(await getSpace(spaceId));
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { spaceId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});
  return ok(await updateSpace(spaceId, payload.userId, parsed.data));
});

export const DELETE = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { spaceId } = await ctx.params;
  await deleteSpace(spaceId, payload.userId);
  return ok({ success: true });
});
