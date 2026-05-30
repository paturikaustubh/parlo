import { prisma } from "@/lib/db";
import type { Space, PricingRule } from "@/shared/types";

export function formatSpace(s: {
  spaceId: string;
  businessId: number;
  name: string;
  address: string | null;
  latitude: unknown;
  longitude: unknown;
  spaceType: string | null;
  isActive: boolean;
  createdAt: Date;
  business: { businessId: string };
}): Space {
  return {
    spaceId: s.spaceId,
    businessId: s.business.businessId,
    name: s.name,
    address: s.address,
    latitude: s.latitude != null ? Number(s.latitude) : null,
    longitude: s.longitude != null ? Number(s.longitude) : null,
    spaceType: s.spaceType,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
  };
}

export function formatPricingRule(r: {
  pricingRuleId: string;
  spaceId: number;
  vehicleType: string;
  durationFromMinutes: number;
  durationToMinutes: number | null;
  amountPaise: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  space: { spaceId: string };
}): PricingRule {
  return {
    pricingRuleId: r.pricingRuleId,
    spaceId: r.space.spaceId,
    vehicleType: r.vehicleType as PricingRule["vehicleType"],
    durationFromMinutes: r.durationFromMinutes,
    durationToMinutes: r.durationToMinutes,
    amountPaise: r.amountPaise,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
