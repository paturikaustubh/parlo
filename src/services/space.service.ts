import { prisma } from "@/lib/db";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";
import { assertSpaceLimit } from "@/lib/subscription-limits";
import {
  formatSpace,
  formatPricingRule,
} from "@/repositories/space.repository";
import type { VehicleType } from "@/shared/types";

async function ownerBusiness(ownerId: number) {
  const b = await prisma.business.findFirst({ where: { ownerId } });
  if (!b) throw new NotFoundError("BUSINESS_NOT_FOUND", "No business found");
  return b;
}

export async function listSpaces(ownerId: number) {
  const b = await ownerBusiness(ownerId);
  const spaces = await prisma.space.findMany({
    where: { businessId: b.id },
    include: { business: { select: { businessId: true } } },
  });
  return spaces.map(formatSpace);
}

export async function createSpace(
  ownerId: number,
  data: {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    spaceType?: string;
  },
) {
  const b = await ownerBusiness(ownerId);
  await assertSpaceLimit(b.id);
  const space = await prisma.space.create({
    data: { businessId: b.id, ...data },
    include: { business: { select: { businessId: true } } },
  });
  return formatSpace(space);
}

export async function getSpace(spaceId: string) {
  const space = await prisma.space.findUnique({
    where: { spaceId },
    include: { business: { select: { businessId: true } } },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");
  return formatSpace(space);
}

export async function updateSpace(
  spaceId: string,
  ownerId: number,
  data: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    isActive?: boolean;
    spaceType?: string;
  },
) {
  const space = await prisma.space.findUnique({
    where: { spaceId },
    include: { business: { select: { ownerId: true, businessId: true } } },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");
  if (space.business.ownerId !== ownerId)
    throw new ForbiddenError("FORBIDDEN", "Not your space");

  const updated = await prisma.space.update({
    where: { spaceId },
    data,
    include: { business: { select: { businessId: true } } },
  });
  return formatSpace(updated);
}

export async function deleteSpace(spaceId: string, ownerId: number) {
  const space = await prisma.space.findUnique({
    where: { spaceId },
    include: { business: { select: { ownerId: true } } },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");
  if (space.business.ownerId !== ownerId)
    throw new ForbiddenError("FORBIDDEN", "Not your space");

  const activeCount = await prisma.parkingSession.count({
    where: { spaceId: space.id, status: "ACTIVE" },
  });
  if (activeCount > 0)
    throw new ConflictError(
      "SPACE_HAS_ACTIVE_SESSIONS",
      "Space has active parking sessions",
    );

  await prisma.space.delete({ where: { spaceId } });
}

export async function getPricing(spaceId: string) {
  const space = await prisma.space.findUnique({
    where: { spaceId },
    select: {
      id: true,
      currentPricingVersion: {
        select: {
          formulaType: true,
          cycleDurationHours: true,
          overflowIntervalMinutes: true,
          overflowAmountPaise: true,
        },
      },
    },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  const rules = await prisma.pricingRule.findMany({
    where: { spaceId: space.id, isActive: true },
    include: { space: { select: { spaceId: true } } },
  });

  const v = space.currentPricingVersion;
  return {
    formulaType: v?.formulaType ?? "FLAT_SLAB",
    cycleDurationHours: v?.cycleDurationHours ?? null,
    overflowIntervalMinutes: v?.overflowIntervalMinutes ?? null,
    overflowAmountPaise: v?.overflowAmountPaise ?? null,
    rules: rules.map(formatPricingRule),
  };
}

export async function replacePricing(
  spaceId: string,
  ownerId: number,
  rules: Array<{
    vehicleType: VehicleType;
    durationFromMinutes: number;
    durationToMinutes?: number | null;
    amountPaise: number;
  }>,
  formulaType: "FLAT_SLAB" | "CYCLIC" | "OVERFLOW" | "CUMULATIVE" = "FLAT_SLAB",
  options?: {
    cycleDurationHours?: number | null;
    overflowIntervalMinutes?: number | null;
    overflowAmountPaise?: number | null;
  },
) {
  const space = await prisma.space.findUnique({
    where: { spaceId },
    include: { business: { select: { ownerId: true } } },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");
  if (space.business.ownerId !== ownerId)
    throw new ForbiddenError("FORBIDDEN", "Not your space");

  await prisma.$transaction([
    prisma.pricingRule.updateMany({
      where: { spaceId: space.id },
      data: { isActive: false },
    }),
    prisma.pricingRule.createMany({
      data: rules.map((r) => ({ spaceId: space.id, ...r })),
    }),
  ]);

  const version = await prisma.pricingFormulaVersion.create({
    data: {
      spaceId: space.id,
      rules: rules as object[],
      formulaType,
      cycleDurationHours:
        formulaType === "CYCLIC" ? (options?.cycleDurationHours ?? null) : null,
      overflowIntervalMinutes:
        formulaType === "OVERFLOW"
          ? (options?.overflowIntervalMinutes ?? null)
          : null,
      overflowAmountPaise:
        formulaType === "OVERFLOW"
          ? (options?.overflowAmountPaise ?? null)
          : null,
    },
  });

  await prisma.space.update({
    where: { id: space.id },
    data: { currentPricingVersionId: version.id },
  });

  const newRules = await prisma.pricingRule.findMany({
    where: { spaceId: space.id, isActive: true },
    include: { space: { select: { spaceId: true } } },
  });

  return {
    formulaType,
    cycleDurationHours: version.cycleDurationHours,
    overflowIntervalMinutes: version.overflowIntervalMinutes,
    overflowAmountPaise: version.overflowAmountPaise,
    rules: newRules.map(formatPricingRule),
  };
}
