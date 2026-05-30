"use client";

import Link from "next/link";
import { PieChart, Pie, Cell } from "recharts";

interface ParkingStatusCardProps {
  totalParked: number;
  byType: Record<string, number>;
  lotHref: string;
}

const TYPE_LABELS: Record<string, string> = {
  TWO_WHEELER: "2W",
  THREE_WHEELER: "3W",
  FOUR_WHEELER: "4W",
  HEAVY: "HV",
};

// Sourced from the app's --chart-* tokens (warm amber scale) + destructive for Heavy
const TYPE_COLORS: Record<string, string> = {
  FOUR_WHEELER: "oklch(0.905 0.182 98.111)", // chart-1 — brightest amber
  TWO_WHEELER: "oklch(0.681 0.162 75.834)", // chart-3 — mid amber
  THREE_WHEELER: "oklch(0.554 0.135 66.442)", // chart-4 — deeper amber
  HEAVY: "oklch(0.704 0.191 22.216)", // destructive (dark) — warm red
};

// Render order: most common → least, keeps the donut visually balanced
const TYPE_ORDER = ["FOUR_WHEELER", "TWO_WHEELER", "THREE_WHEELER", "HEAVY"];

export function ParkingStatusCard({
  totalParked,
  byType,
  lotHref,
}: ParkingStatusCardProps) {
  const data = TYPE_ORDER.filter((type) => (byType[type] ?? 0) > 0).map(
    (type) => ({
      type,
      count: byType[type],
      label: TYPE_LABELS[type] ?? type,
      color: TYPE_COLORS[type] ?? "oklch(0.795 0.184 86.047)",
    }),
  );

  // Fall back: any types not in TYPE_ORDER (future-proofing)
  const knownTypes = new Set(TYPE_ORDER);
  Object.entries(byType).forEach(([type, count]) => {
    if (!knownTypes.has(type) && count > 0) {
      data.push({
        type,
        count,
        label: TYPE_LABELS[type] ?? type,
        color: "oklch(0.795 0.184 86.047)",
      });
    }
  });

  const isEmpty = totalParked === 0 || data.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Parked now
        </p>
        <Link
          href={lotHref}
          className="text-xs text-primary hover:underline underline-offset-2 transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {isEmpty ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          No vehicles currently parked
        </p>
      ) : (
        <div className="flex items-center gap-4">
          {/* Donut + centre count */}
          <div className="relative shrink-0 w-20 h-20">
            <PieChart width={80} height={80}>
              <Pie
                data={data}
                dataKey="count"
                cx={40}
                cy={40}
                innerRadius={24}
                outerRadius={36}
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {data.map((entry) => (
                  <Cell key={entry.type} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            {/* Centre total */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="font-heading font-bold text-xl text-foreground leading-none">
                {totalParked}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {data.map((entry) => (
              <div key={entry.type} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: entry.color }}
                />
                <span className="text-muted-foreground truncate">
                  {entry.label}
                </span>
                <span className="font-semibold text-foreground ml-auto tabular-nums">
                  {entry.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
