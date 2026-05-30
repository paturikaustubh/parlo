"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api-client";

interface PricingRule {
  vehicleType: string;
  durationFromMinutes: number;
  durationToMinutes: number | null;
  amountPaise: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  spaceId: string;
  spaceName: string;
  supportedVehicleTypes: string[];
}

const VEHICLE_LABELS: Record<string, string> = {
  TWO_WHEELER: "2-Wheeler",
  THREE_WHEELER: "3-Wheeler",
  FOUR_WHEELER: "4-Wheeler",
  HEAVY: "Heavy",
};

function slabLabel(fromMin: number, toMin: number | null): string {
  const fromH = fromMin / 60;
  const toH = toMin ? toMin / 60 : null;
  if (toH === null) return `${fromH}h+`;
  if (fromH === 0 && toH <= 1) return `0 – ${toH * 60}min`;
  return `${fromH}h – ${toH}h`;
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

export function RatesSheet({
  open,
  onOpenChange,
  spaceId,
  spaceName,
  supportedVehicleTypes,
}: Props) {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [lastUpdatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !spaceId) return;
    setRules([]);
    setUpdatedAt(null);
    setLoading(true);
    apiFetch<{ rules: PricingRule[]; lastUpdatedAt: string | null }>(
      `/spaces/${spaceId}/rates`,
      { auth: false },
    )
      .then((d) => {
        setRules(d.rules);
        setUpdatedAt(d.lastUpdatedAt);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, spaceId]);

  const slabKeys = [
    ...new Set(
      rules.map((r) => `${r.durationFromMinutes}:${r.durationToMinutes ?? ""}`),
    ),
  ].sort((a, b) => parseInt(a) - parseInt(b));

  const grid: Record<string, Record<string, number>> = {};
  for (const rule of rules) {
    const key = `${rule.durationFromMinutes}:${rule.durationToMinutes ?? ""}`;
    if (!grid[key]) grid[key] = {};
    grid[key][rule.vehicleType] = rule.amountPaise;
  }

  const ruledTypes = [...new Set(rules.map((r) => r.vehicleType))];
  const visibleTypes =
    supportedVehicleTypes.length > 0
      ? supportedVehicleTypes.filter((vt) => ruledTypes.includes(vt))
      : ruledTypes;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-10"
      >
        <SheetHeader className="mb-5">
          <SheetTitle>Rates — {spaceName}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No pricing configured yet.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                      Duration
                    </th>
                    {visibleTypes.map((vt) => (
                      <th
                        key={vt}
                        className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                      >
                        {VEHICLE_LABELS[vt] ?? vt}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slabKeys.map((key) => {
                    const [fromStr, toStr] = key.split(":");
                    const fromMin = parseInt(fromStr);
                    const toMin = toStr ? parseInt(toStr) : null;
                    return (
                      <tr
                        key={key}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {slabLabel(fromMin, toMin)}
                        </td>
                        {visibleTypes.map((vt) => (
                          <td
                            key={vt}
                            className="px-3 py-2.5 text-center text-xs font-semibold text-foreground tabular-nums"
                          >
                            {grid[key]?.[vt] != null ? (
                              fmtPaise(grid[key][vt])
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {lastUpdatedAt && (
              <p className="text-[11px] text-muted-foreground text-center mt-4">
                Rates since {fmtDate(lastUpdatedAt)}
              </p>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
