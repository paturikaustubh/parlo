import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { updateBusiness } from "@/services/business.service";

type Ctx = { params: Promise<{ businessId: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { businessId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  return ok(await updateBusiness(businessId, payload.userId, parsed.data));
});
