"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ComposedChart,
  Bar,
  Line,
  BarChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { apiFetch } from "@/lib/api-client";
import {
  formatAmount,
  formatDuration,
  TYPE_TO_DISPLAY,
} from "@/lib/vehicle-utils";
import type { VehicleType } from "@/shared/types/enums";
import {
  IconCar,
  IconMapPin,
  IconReceipt,
  IconClock,
  IconTrendingUp,
} from "@tabler/icons-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d" | "all";

interface AnalyticsData {
  totalSessions: number;
  totalSpentPaise: number;
  avgDurationMinutes: number;
  mostVisitedSpaces: { spaceId: string; spaceName: string; count: number }[];
  vehicleUsage: { vehicleType: VehicleType; count: number }[];
  spendingTrend: { month: string; spentPaise: number; sessionCount: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rangeToFromDate(range: Range): string | undefined {
  if (range === "all") return undefined;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** "2025-04" → "Apr '25" */
function formatMonth(month: string): string {
  const [year, mon] = month.split("-");
  const date = new Date(Number(year), Number(mon) - 1, 1);
  const label = date.toLocaleDateString("en-IN", { month: "short" });
  return `${label} '${String(year).slice(2)}`;
}

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-56" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon size={14} className="shrink-0" />
          <span className="text-[11px] font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        <p className="font-heading font-bold text-2xl text-foreground leading-none">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <IconTrendingUp size={40} className="text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">
        No parking history yet for this period.
      </p>
      <p className="text-xs text-muted-foreground/60">
        Your analytics will appear here once you start parking.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState(false);
  const cache = useRef<Map<string, AnalyticsData>>(new Map());

  useEffect(() => {
    const from = rangeToFromDate(range);
    const cacheKey = range;

    // Show cached data instantly if available
    if (cache.current.has(cacheKey)) {
      setData(cache.current.get(cacheKey)!);
      setFirstLoad(false);
    }

    const params = from ? `?from=${encodeURIComponent(from)}` : "";
    setError(false);
    apiFetch<AnalyticsData>(`/users/me/analytics${params}`)
      .then((fresh) => {
        cache.current.set(cacheKey, fresh);
        setData(fresh);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setFirstLoad(false));
  }, [range]);

  // Spending trend — convert paise to rupees for display
  const trendData = (data?.spendingTrend ?? []).map((t) => ({
    ...t,
    label: formatMonth(t.month),
  }));

  // Vehicle donut data
  const vehicleData = (data?.vehicleUsage ?? []).map((v) => ({
    name: TYPE_TO_DISPLAY[v.vehicleType] ?? v.vehicleType,
    value: v.count,
  }));

  // Top spaces horizontal bar (cap at 6)
  const spacesData = (data?.mostVisitedSpaces ?? []).slice(0, 6).map((s) => ({
    name: s.spaceName,
    visits: s.count,
  }));

  const showEmpty = !firstLoad && data !== null && data.totalSessions === 0;
  const showError = !firstLoad && data === null && error;

  return (
    <div className="space-y-5">
      {/* Header + Period tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-heading font-bold text-xl text-foreground">
          Analytics
        </h1>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList className="h-8">
            <TabsTrigger value="7d" className="text-[11px] px-2.5">
              7 days
            </TabsTrigger>
            <TabsTrigger value="30d" className="text-[11px] px-2.5">
              30 days
            </TabsTrigger>
            <TabsTrigger value="90d" className="text-[11px] px-2.5">
              90 days
            </TabsTrigger>
            <TabsTrigger value="all" className="text-[11px] px-2.5">
              All time
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {firstLoad ? (
        <LoadingSkeleton />
      ) : showError ? (
        <p className="text-sm text-destructive text-center py-12">
          Failed to load analytics. Try refreshing.
        </p>
      ) : showEmpty ? (
        <EmptyState />
      ) : (
        <>
          {/* 4 KPI cards — 2×2 grid */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Trips"
              value={String(data?.totalSessions ?? 0)}
              icon={IconCar}
            />
            <KpiCard
              label="Total spent"
              value={formatAmount(data?.totalSpentPaise ?? 0)}
              icon={IconReceipt}
            />
            <KpiCard
              label="Avg. duration"
              value={formatDuration(data?.avgDurationMinutes ?? 0)}
              icon={IconClock}
            />
            <KpiCard
              label="Spaces visited"
              value={String(data?.mostVisitedSpaces?.length ?? 0)}
              icon={IconMapPin}
            />
          </div>

          {/* Spending trend — ComposedChart: Bar (spending) + Line (sessions), dual Y-axes */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <IconTrendingUp size={15} className="text-primary" />
                  Spending trend
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ChartContainer
                  config={{
                    spentPaise: {
                      label: "Spent (₹)",
                      color: "var(--chart-1)",
                    },
                    sessionCount: {
                      label: "Sessions",
                      color: "var(--chart-2)",
                    },
                  }}
                  className="h-52 w-full"
                >
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `₹${Math.round(v / 100)}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => {
                            if (name === "spentPaise")
                              return [
                                `₹${Math.round(Number(value) / 100)}`,
                                "Spent",
                              ];
                            return [String(value), "Sessions"];
                          }}
                        />
                      }
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="spentPaise"
                      fill="var(--chart-1)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={32}
                    />
                    <Line
                      yAxisId="right"
                      dataKey="sessionCount"
                      type="monotone"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Vehicle donut + Top spaces side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Vehicle usage donut */}
            {vehicleData.length > 0 && (
              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <IconCar size={15} className="text-primary" />
                    Vehicles
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                  <ChartContainer
                    config={Object.fromEntries(
                      vehicleData.map((d, i) => [
                        d.name,
                        {
                          label: d.name,
                          color: PIE_COLORS[i % PIE_COLORS.length],
                        },
                      ]),
                    )}
                    className="h-36 w-full"
                  >
                    <PieChart>
                      <Pie
                        data={vehicleData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="45%"
                        outerRadius="70%"
                        paddingAngle={2}
                      >
                        {vehicleData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                  {/* Legend */}
                  <div className="flex flex-col gap-1 mt-1 px-1">
                    {vehicleData.map((d, i) => (
                      <div
                        key={d.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              background: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          <span className="text-[11px] text-muted-foreground truncate">
                            {d.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold font-heading text-foreground">
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top spaces horizontal bar chart */}
            {spacesData.length > 0 && (
              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <IconMapPin size={15} className="text-primary" />
                    Top spaces
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                  <ChartContainer
                    config={{
                      visits: { label: "Visits", color: "var(--chart-1)" },
                    }}
                    className="h-36 w-full"
                  >
                    <BarChart
                      layout="vertical"
                      data={spacesData}
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={60}
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: string) =>
                          v.length > 8 ? `${v.slice(0, 8)}…` : v
                        }
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="visits"
                        fill="var(--chart-1)"
                        radius={[0, 3, 3, 0]}
                        maxBarSize={14}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
