import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { getPricing, replacePricing } from "@/services/space.service";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ spaceId: string }> };

const VEHICLE_TYPES = [
  "TWO_WHEELER",
  "THREE_WHEELER",
  "FOUR_WHEELER",
  "HEAVY",
] as const;
const ruleSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES),
  durationFromMinutes: z.number().int().min(0),
  durationToMinutes: z.number().int().min(1).nullable().optional(),
  amountPaise: z.number().int().min(0),
});
const putSchema = z.object({
  formulaType: z
    .enum(["FLAT_SLAB", "CYCLIC", "OVERFLOW", "CUMULATIVE"])
    .default("FLAT_SLAB"),
  cycleDurationHours: z.number().min(0.01).nullable().optional(),
  overflowIntervalMinutes: z.number().int().min(1).nullable().optional(),
  overflowAmountPaise: z.number().int().min(0).nullable().optional(),
  rules: z.array(ruleSchema).min(1),
});

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "STAFF", "OWNER");
  const { spaceId } = await ctx.params;

  const space = await prisma.space.findUnique({
    where: { spaceId },
    include: { business: { select: { ownerId: true } } },
  });
  if (!space) throw new ForbiddenError("FORBIDDEN", "Space not found");

  const isOwner = space.business.ownerId === payload.userId;
  if (!isOwner) {
    const member = await prisma.staffMember.findFirst({
      where: { userId: payload.userId, businessId: space.businessId },
    });
    if (!member) throw new ForbiddenError("FORBIDDEN", "Not your space");
  }

  return ok(await getPricing(spaceId));
});

export const PUT = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { spaceId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const {
    formulaType,
    rules,
    cycleDurationHours,
    overflowIntervalMinutes,
    overflowAmountPaise,
  } = parsed.data;
  return ok(
    await replacePricing(spaceId, payload.userId, rules, formulaType, {
      cycleDurationHours,
      overflowIntervalMinutes,
      overflowAmountPaise,
    }),
  );
});
