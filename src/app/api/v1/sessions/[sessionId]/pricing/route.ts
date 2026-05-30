import type { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireAuth } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ sessionId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { sessionId } = await ctx.params;

  const session = await prisma.parkingSession.findUnique({
    where: { parkingSessionId: sessionId },
    select: {
      parkingSessionId: true,
      userId: true,
      pricingVersionId: true,
      spaceId: true,
      pricingVersion: {
        select: {
          id: true,
          rules: true,
          formulaType: true,
          cycleDurationHours: true,
          overflowIntervalMinutes: true,
          overflowAmountPaise: true,
          createdAt: true,
          spaceId: true,
        },
      },
    },
  });

  if (!session) throw new NotFoundError("NOT_FOUND", "Session not found");

  // Staff and owners can view any session's pricing; only block mismatched regular users
  const isPrivileged = auth?.roles?.some((r) =>
    ["STAFF", "OWNER", "VERIFIER"].includes(r),
  );
  if (
    auth &&
    !isPrivileged &&
    session.userId &&
    session.userId !== auth.userId
  ) {
    throw new NotFoundError("NOT_FOUND", "Session not found");
  }

  // If no version stored (legacy), fall back to current active pricing rules
  if (!session.pricingVersion) {
    const rules = await prisma.pricingRule.findMany({
      where: { spaceId: session.spaceId, isActive: true },
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
      formulaType: "FLAT_SLAB",
      cycleDurationHours: null,
      overflowIntervalMinutes: null,
      overflowAmountPaise: null,
      since: lastUpdatedAt,
      until: null,
    });
  }

  // Find the next pricing version for this space (if any) to determine "until"
  const nextVersion = await prisma.pricingFormulaVersion.findFirst({
    where: {
      spaceId: session.pricingVersion.spaceId,
      createdAt: { gt: session.pricingVersion.createdAt },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const rules = session.pricingVersion.rules as Array<{
    vehicleType: string;
    durationFromMinutes: number;
    durationToMinutes: number | null;
    amountPaise: number;
  }>;

  return ok({
    rules,
    formulaType: session.pricingVersion.formulaType,
    cycleDurationHours: session.pricingVersion.cycleDurationHours ?? null,
    overflowIntervalMinutes:
      session.pricingVersion.overflowIntervalMinutes ?? null,
    overflowAmountPaise: session.pricingVersion.overflowAmountPaise ?? null,
    since: session.pricingVersion.createdAt.toISOString(),
    until: nextVersion ? nextVersion.createdAt.toISOString() : null,
  });
});
