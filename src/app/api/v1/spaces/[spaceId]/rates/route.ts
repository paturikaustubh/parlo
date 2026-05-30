import type { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ spaceId: string }> };

export const GET = withErrorHandling(async (_req: NextRequest, ctx: Ctx) => {
  const { spaceId } = await ctx.params;

  const space = await prisma.space.findUnique({
    where: { spaceId },
    select: { id: true },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  const rules = await prisma.pricingRule.findMany({
    where: { spaceId: space.id, isActive: true },
    orderBy: [{ durationFromMinutes: "asc" }, { vehicleType: "asc" }],
    select: {
      vehicleType: true,
      durationFromMinutes: true,
      durationToMinutes: true,
      amountPaise: true,
      createdAt: true,
    },
  });

  const lastUpdatedAt =
    rules.length > 0
      ? new Date(
          Math.max(...rules.map((r) => r.createdAt.getTime())),
        ).toISOString()
      : null;

  return ok({
    rules: rules.map((r) => ({
      vehicleType: r.vehicleType,
      durationFromMinutes: r.durationFromMinutes,
      durationToMinutes: r.durationToMinutes ?? null,
      amountPaise: r.amountPaise,
    })),
    lastUpdatedAt,
  });
});
