import { prisma } from "@/lib/db";

type PricingRuleSnapshot = {
  vehicleType: string;
  durationFromMinutes: number;
  durationToMinutes: number | null;
  amountPaise: number;
};

function applySlabs(
  rules: PricingRuleSnapshot[],
  durationMinutes: number,
): number {
  let total = 0;
  for (const rule of rules) {
    if (durationMinutes >= rule.durationFromMinutes) {
      total = rule.amountPaise;
    }
  }
  return total;
}

function applyCyclic(
  rules: PricingRuleSnapshot[],
  durationMinutes: number,
  cycleDurationHours: number,
): number {
  const cycleMins = cycleDurationHours * 60;
  const fullCycles = Math.floor(durationMinutes / cycleMins);
  const remainder = durationMinutes % cycleMins;
  const fullCycleAmt = applySlabs(rules, cycleMins);
  const remainderAmt = applySlabs(rules, remainder);
  return fullCycles * fullCycleAmt + remainderAmt;
}

function applyOverflow(
  rules: PricingRuleSnapshot[],
  durationMinutes: number,
  overflowIntervalMinutes: number,
  overflowAmountPaise: number,
): number {
  const lastEnd = rules.reduce<number | null>(
    (max, r) =>
      r.durationToMinutes !== null &&
      (max === null || r.durationToMinutes > max)
        ? r.durationToMinutes
        : max,
    null,
  );

  if (lastEnd === null || durationMinutes <= lastEnd) {
    return applySlabs(rules, durationMinutes);
  }

  const baseCost = applySlabs(rules, lastEnd);
  const overflowMins = durationMinutes - lastEnd;
  const intervals = Math.ceil(overflowMins / overflowIntervalMinutes);
  return baseCost + intervals * overflowAmountPaise;
}

function applyCumulative(
  rules: PricingRuleSnapshot[],
  durationMinutes: number,
): number {
  let total = 0;
  for (const rule of rules) {
    if (durationMinutes <= rule.durationFromMinutes) break;
    const bracketEnd = rule.durationToMinutes;
    if (bracketEnd === null) break;

    const bracketDuration = bracketEnd - rule.durationFromMinutes;
    if (bracketDuration <= 0) continue;

    const timeInBracket =
      Math.min(durationMinutes, bracketEnd) - rule.durationFromMinutes;
    total += (timeInBracket / bracketDuration) * rule.amountPaise;
  }
  return Math.round(total);
}

export async function calculateAmount(
  spaceId: number,
  vehicleType: string,
  durationMinutes: number,
): Promise<number> {
  const rules = await prisma.pricingRule.findMany({
    where: { spaceId, vehicleType, isActive: true },
    orderBy: { durationFromMinutes: "asc" },
  });
  if (rules.length === 0) return 0;
  return applySlabs(rules, durationMinutes);
}

export async function calculateAmountFromVersion(
  pricingVersionId: number,
  vehicleType: string,
  durationMinutes: number,
): Promise<number> {
  const version = await prisma.pricingFormulaVersion.findUnique({
    where: { id: pricingVersionId },
  });
  if (!version) return 0;

  const allRules = version.rules as PricingRuleSnapshot[];
  const relevant = allRules
    .filter((r) => r.vehicleType === vehicleType)
    .sort((a, b) => a.durationFromMinutes - b.durationFromMinutes);

  if (relevant.length === 0) return 0;

  switch (version.formulaType) {
    case "CYCLIC":
      if (version.cycleDurationHours && version.cycleDurationHours > 0)
        return applyCyclic(
          relevant,
          durationMinutes,
          version.cycleDurationHours,
        );
      break;

    case "OVERFLOW":
      if (version.overflowIntervalMinutes && version.overflowAmountPaise)
        return applyOverflow(
          relevant,
          durationMinutes,
          version.overflowIntervalMinutes,
          version.overflowAmountPaise,
        );
      break;

    case "CUMULATIVE":
      return applyCumulative(relevant, durationMinutes);
  }

  return applySlabs(relevant, durationMinutes);
}
