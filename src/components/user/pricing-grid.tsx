"use client";

export interface PricingRule {
  vehicleType: string;
  durationFromMinutes: number;
  durationToMinutes: number | null;
  amountPaise: number;
}

interface Props {
  rules: PricingRule[];
  supportedVehicleTypes: string[];
  highlightVehicleType?: string | null;
  highlightDurationMinutes?: number | null;
  since?: string | null;
  until?: string | null;
  formulaType?: string | null;
  cycleDurationHours?: number | null;
  overflowIntervalMinutes?: number | null;
  overflowAmountPaise?: number | null;
}

const VEHICLE_LABELS: Record<string, string> = {
  TWO_WHEELER: "2-Wheeler",
  THREE_WHEELER: "3-Wheeler",
  FOUR_WHEELER: "4-Wheeler",
  HEAVY: "Heavy",
};

const A = "212,160,23"; // amber RGB

function slabLabel(fromMin: number, toMin: number | null): string {
  const fromH = fromMin / 60;
  const toH = toMin ? toMin / 60 : null;
  if (toH === null) return `${fromH}h+`;
  if (fromH === 0 && toH <= 1) return `0–${toH * 60}min`;
  return `${fromH}h–${toH}h`;
}

function fmtPaise(p: number): string {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PricingGrid({
  rules,
  supportedVehicleTypes,
  highlightVehicleType,
  highlightDurationMinutes,
  since,
  until,
  formulaType,
  cycleDurationHours,
  overflowIntervalMinutes,
  overflowAmountPaise,
}: Props) {
  // Unique slabs sorted by fromMin
  const slabKeys = [
    ...new Set(
      rules.map((r) => `${r.durationFromMinutes}:${r.durationToMinutes ?? ""}`),
    ),
  ].sort((a, b) => parseInt(a) - parseInt(b));

  // Grid lookup
  const grid: Record<string, Record<string, number>> = {};
  for (const rule of rules) {
    const key = `${rule.durationFromMinutes}:${rule.durationToMinutes ?? ""}`;
    if (!grid[key]) grid[key] = {};
    grid[key][rule.vehicleType] = rule.amountPaise;
  }

  // Visible types: intersection of supported + has rules
  const ruledTypes = [...new Set(rules.map((r) => r.vehicleType))];
  const visibleTypes =
    supportedVehicleTypes.length > 0
      ? supportedVehicleTypes.filter((vt) => ruledTypes.includes(vt))
      : ruledTypes;

  // Find matched slab for the highlight
  let matchedSlabKey: string | null = null;
  if (highlightDurationMinutes != null && highlightVehicleType) {
    const vRules = rules
      .filter((r) => r.vehicleType === highlightVehicleType)
      .sort((a, b) => a.durationFromMinutes - b.durationFromMinutes);
    let matched: PricingRule | null = null;
    for (const rule of vRules) {
      if (rule.durationFromMinutes <= highlightDurationMinutes) matched = rule;
    }
    if (matched)
      matchedSlabKey = `${matched.durationFromMinutes}:${matched.durationToMinutes ?? ""}`;
  }

  // Compute overflow when OVERFLOW formula + duration exceeds last slab
  let overflowIntervals = 0;
  let overflowTotal = 0;
  let overflowExtraMinutes = 0;
  const showOverflow = !!(
    formulaType === "OVERFLOW" &&
    highlightDurationMinutes != null &&
    highlightVehicleType &&
    overflowIntervalMinutes &&
    overflowAmountPaise
  );
  if (
    showOverflow &&
    highlightDurationMinutes != null &&
    overflowIntervalMinutes &&
    overflowAmountPaise
  ) {
    const vRules = rules
      .filter((r) => r.vehicleType === highlightVehicleType)
      .sort((a, b) => a.durationFromMinutes - b.durationFromMinutes);
    const lastSlab = vRules[vRules.length - 1];
    if (
      lastSlab?.durationToMinutes != null &&
      highlightDurationMinutes > lastSlab.durationToMinutes
    ) {
      overflowExtraMinutes =
        highlightDurationMinutes - lastSlab.durationToMinutes;
      overflowIntervals = Math.ceil(
        overflowExtraMinutes / overflowIntervalMinutes,
      );
      overflowTotal = overflowIntervals * overflowAmountPaise;
    }
  }
  const hasOverflow = showOverflow && overflowIntervals > 0;

  // Compute cyclic breakdown when CYCLIC formula
  let cyclicFullCycles = 0;
  let cyclicRemainder = 0;
  let cyclicCostPerCycle = 0;
  let cyclicRemainderCost = 0;
  const showCyclic = !!(
    formulaType === "CYCLIC" &&
    cycleDurationHours &&
    cycleDurationHours > 0 &&
    highlightDurationMinutes != null &&
    highlightVehicleType
  );
  if (showCyclic && highlightDurationMinutes != null && cycleDurationHours) {
    const cycleMinutes = cycleDurationHours * 60;
    cyclicFullCycles = Math.floor(highlightDurationMinutes / cycleMinutes);
    cyclicRemainder = highlightDurationMinutes % cycleMinutes;
    const vRules = rules
      .filter((r) => r.vehicleType === highlightVehicleType)
      .sort((a, b) => a.durationFromMinutes - b.durationFromMinutes);
    // Cost for a full cycle = last matching slab at cycleMinutes
    for (const r of vRules) {
      if (r.durationFromMinutes <= cycleMinutes)
        cyclicCostPerCycle = r.amountPaise;
    }
    // Cost for remainder
    for (const r of vRules) {
      if (r.durationFromMinutes <= cyclicRemainder)
        cyclicRemainderCost = r.amountPaise;
    }
  }
  const hasCyclic = showCyclic && (cyclicFullCycles > 0 || cyclicRemainder > 0);

  function cellBg(isRow: boolean, isCol: boolean) {
    if (isRow && isCol) return `rgba(${A},0.18)`;
    if (isRow || isCol) return `rgba(${A},0.08)`;
    return "transparent";
  }

  if (rules.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No pricing configured.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap bg-muted/20">
                Duration
              </th>
              {visibleTypes.map((vt) => {
                const isCol = vt === highlightVehicleType;
                return (
                  <th
                    key={vt}
                    className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                    style={{
                      background: isCol ? `rgba(${A},0.08)` : "var(--muted)",
                      color: isCol ? `rgb(${A})` : undefined,
                    }}
                  >
                    {VEHICLE_LABELS[vt] ?? vt}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slabKeys.map((key, idx) => {
              const [fromStr, toStr] = key.split(":");
              const fromMin = parseInt(fromStr);
              const toMin = toStr ? parseInt(toStr) : null;
              const isRow = key === matchedSlabKey;

              return (
                <tr
                  key={key}
                  className={
                    idx < slabKeys.length - 1 ? "border-b border-border/40" : ""
                  }
                  style={{
                    background: isRow ? `rgba(${A},0.08)` : "transparent",
                  }}
                >
                  <td
                    className="px-3 py-2.5 text-xs font-medium whitespace-nowrap"
                    style={{
                      color: isRow ? `rgb(${A})` : "var(--muted-foreground)",
                    }}
                  >
                    {isRow && <span className="mr-1 opacity-60">›</span>}
                    {slabLabel(fromMin, toMin)}
                  </td>
                  {visibleTypes.map((vt) => {
                    const isCol = vt === highlightVehicleType;
                    const isCell = isRow && isCol;
                    const price = grid[key]?.[vt];
                    return (
                      <td
                        key={vt}
                        className="px-3 py-2.5 text-center text-xs tabular-nums"
                        style={{ background: cellBg(isRow, isCol) }}
                      >
                        {price != null ? (
                          <span
                            className={
                              isCell
                                ? "font-bold"
                                : "font-medium text-foreground"
                            }
                            style={{ color: isCell ? `rgb(${A})` : undefined }}
                          >
                            {fmtPaise(price)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/25">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasOverflow && overflowIntervalMinutes && overflowAmountPaise && (
        <div
          className="rounded-xl border px-4 py-3 space-y-1"
          style={{
            borderColor: `rgba(${A},0.3)`,
            background: `rgba(${A},0.06)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-semibold"
              style={{ color: `rgb(${A})` }}
            >
              Extended Rate
            </span>
            <span className="text-xs font-bold" style={{ color: `rgb(${A})` }}>
              {fmtPaise(overflowTotal)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {fmtPaise(overflowAmountPaise)} per {overflowIntervalMinutes}min ·{" "}
            {overflowIntervals} interval{overflowIntervals > 1 ? "s" : ""}·{" "}
            {overflowExtraMinutes}min over last slab
          </p>
        </div>
      )}

      {hasCyclic && (
        <div
          className="rounded-xl border px-4 py-3 space-y-1.5"
          style={{
            borderColor: `rgba(${A},0.3)`,
            background: `rgba(${A},0.06)`,
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: `rgb(${A})` }}
          >
            Cyclic breakdown
          </p>
          {cyclicFullCycles > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {cyclicFullCycles} full cycle{cyclicFullCycles > 1 ? "s" : ""} ×{" "}
                {fmtPaise(cyclicCostPerCycle)}
              </span>
              <span className="font-semibold" style={{ color: `rgb(${A})` }}>
                {fmtPaise(cyclicFullCycles * cyclicCostPerCycle)}
              </span>
            </div>
          )}
          {cyclicRemainder > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Remainder {cyclicRemainder}min → {fmtPaise(cyclicRemainderCost)}
              </span>
              <span className="font-semibold" style={{ color: `rgb(${A})` }}>
                +{fmtPaise(cyclicRemainderCost)}
              </span>
            </div>
          )}
          {cyclicFullCycles > 0 && cyclicRemainder > 0 && (
            <>
              <div
                className="border-t"
                style={{ borderColor: `rgba(${A},0.2)` }}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Total</span>
                <span className="font-bold" style={{ color: `rgb(${A})` }}>
                  {fmtPaise(
                    cyclicFullCycles * cyclicCostPerCycle + cyclicRemainderCost,
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {since && (
        <p className="text-[10px] text-center text-muted-foreground/60">
          Rates {fmtDate(since)} → {until ? fmtDate(until) : "Current"}
        </p>
      )}
    </div>
  );
}
