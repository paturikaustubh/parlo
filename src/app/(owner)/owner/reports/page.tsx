"use client";

import useSWR from "swr";
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
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
  IconTrendingUp,
  IconCurrencyRupee,
  IconCar,
  IconClock,
  IconUsers,
  IconRefresh,
} from "@tabler/icons-react";
import { formatAmount } from "@/lib/vehicle-utils";
import { pageFetcher } from "@/lib/swr-fetcher";
import { usePaginationParams } from "@/lib/use-pagination-params";

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d";

interface OwnerAnalytics {
  totalRevenuePaise: number;
  totalSessions: number;
  avgDurationMinutes: number;
  dailyRevenueTrend: {
    date: string;
    revenuePaise: number;
    sessionCount: number;
  }[];
  spaceUtilization: {
    spaceId: string;
    spaceName: string;
    sessionCount: number;
    revenuePaise: number;
  }[];
  vehicleTypeMix: { vehicleType: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  staffPerformance: {
    staffMemberId: string;
    name: string;
    checkIns: number;
    checkOuts: number;
    approvals: number;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rangeToFrom(range: Range): string {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatDuration(mins: number): string {
  if (!mins) return "—";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

const VEHICLE_LABELS: Record<string, string> = {
  TWO_WHEELER: "2W",
  THREE_WHEELER: "3W",
  FOUR_WHEELER: "4W",
  HEAVY: "HV",
};

// chart-1…chart-5 come from globals.css via the shadcn preset
const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// ─── Chart configs ─────────────────────────────────────────────────────────────

const trendConfig = {
  revenuePaise: { label: "Revenue", color: "var(--chart-1)" },
  sessionCount: { label: "Sessions", color: "var(--chart-2)" },
};

const spaceConfig = {
  revenuePaise: { label: "Revenue", color: "var(--chart-1)" },
};

const peakConfig = {
  count: { label: "Sessions", color: "var(--chart-1)" },
};

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OwnerReportsPage() {
  const { get, setParam } = usePaginationParams();
  const range = get("range", "30d") as Range;

  const { data, isLoading, isValidating, mutate } = useSWR<OwnerAnalytics>(
    ["/analytics/me", { from: rangeToFrom(range) }],
    pageFetcher,
    {
      dedupingInterval: 5 * 60 * 1000, // 5 min cache per tab
      keepPreviousData: true,
    },
  );

  // isLoading: true only on first fetch (no cached data yet) → show skeleton
  // isValidating && data: stale data visible while revalidating → show subtle spin indicator

  const d = {
    totalRevenuePaise: data?.totalRevenuePaise ?? 0,
    totalSessions: data?.totalSessions ?? 0,
    avgDurationMinutes: data?.avgDurationMinutes ?? 0,
    dailyRevenueTrend: data?.dailyRevenueTrend ?? [],
    spaceUtilization: data?.spaceUtilization ?? [],
    vehicleTypeMix: data?.vehicleTypeMix ?? [],
    peakHours: data?.peakHours ?? [],
    staffPerformance: data?.staffPerformance ?? [],
  };

  const avgPerSession =
    d.totalSessions > 0 ? Math.round(d.totalRevenuePaise / d.totalSessions) : 0;

  const isEmpty =
    !data || (d.totalSessions === 0 && d.dailyRevenueTrend.length === 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
          Reports
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-muted p-1 gap-0.5">
            {RANGES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setParam("range", key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  range === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => mutate()}
            disabled={isValidating}
          >
            <IconRefresh
              size={14}
              className={isValidating ? "animate-spin" : ""}
            />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-56 rounded-xl bg-muted animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-48 rounded-xl bg-muted animate-pulse" />
            <div className="h-48 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      ) : isEmpty ? (
        <div className="text-center py-16 space-y-2">
          <IconTrendingUp size={32} className="text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            No data yet for this period
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Revenue",
                value: formatAmount(d.totalRevenuePaise),
                icon: IconCurrencyRupee,
              },
              {
                label: "Sessions",
                value: String(d.totalSessions),
                icon: IconCar,
              },
              {
                label: "Avg duration",
                value: formatDuration(d.avgDurationMinutes),
                icon: IconClock,
              },
              {
                label: "Avg / session",
                value: formatAmount(avgPerSession),
                icon: IconTrendingUp,
              },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </p>
                    <Icon size={14} className="text-muted-foreground" />
                  </div>
                  <p className="font-heading font-bold text-2xl text-foreground leading-none">
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Revenue & Sessions Trend */}
          {d.dailyRevenueTrend.length > 0 && (
            <Card>
              <CardHeader className="px-4 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <IconTrendingUp size={15} className="text-primary" />
                  Revenue &amp; Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2">
                <ChartContainer config={trendConfig} className="h-52 w-full">
                  <ComposedChart
                    data={d.dailyRevenueTrend}
                    margin={{ left: 8, right: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      tickFormatter={fmtDate}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="rev"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `₹${Math.round(v / 100)}`}
                      width={40}
                    />
                    <YAxis
                      yAxisId="sess"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      width={28}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) =>
                            name === "revenuePaise"
                              ? [formatAmount(value as number), "Revenue"]
                              : [value, "Sessions"]
                          }
                          labelFormatter={(label) => fmtDate(String(label))}
                        />
                      }
                    />
                    <Bar
                      yAxisId="rev"
                      dataKey="revenuePaise"
                      fill="var(--color-revenuePaise)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={32}
                    />
                    <Line
                      yAxisId="sess"
                      dataKey="sessionCount"
                      stroke="var(--color-sessionCount)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Space Revenue + Vehicle Mix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {d.spaceUtilization.length > 0 && (
              <Card>
                <CardHeader className="px-4 py-4">
                  <CardTitle className="text-sm font-semibold">
                    Revenue by space
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2">
                  <ChartContainer
                    config={spaceConfig}
                    className="w-full"
                    style={{
                      height: `${Math.max(d.spaceUtilization.length * 44, 120)}px`,
                    }}
                  >
                    <BarChart
                      layout="vertical"
                      data={d.spaceUtilization}
                      margin={{ left: 4, right: 40 }}
                    >
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `₹${Math.round(v / 100)}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="spaceName"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        width={80}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) =>
                              name === "revenuePaise"
                                ? [formatAmount(value as number), "Revenue"]
                                : [value, "Sessions"]
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="revenuePaise"
                        fill="var(--color-revenuePaise)"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={20}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {d.vehicleTypeMix.length > 0 && (
              <Card>
                <CardHeader className="px-4 py-4">
                  <CardTitle className="text-sm font-semibold">
                    Vehicle mix
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 flex flex-col items-center gap-3">
                  <ChartContainer config={{}} className="h-40 w-full">
                    <PieChart>
                      <Pie
                        data={d.vehicleTypeMix}
                        dataKey="count"
                        nameKey="vehicleType"
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={64}
                        strokeWidth={2}
                      >
                        {d.vehicleTypeMix.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          value,
                          VEHICLE_LABELS[name as string] ?? name,
                        ]}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="flex flex-wrap justify-center gap-3">
                    {d.vehicleTypeMix.map((v, i) => (
                      <div
                        key={v.vehicleType}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            background: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-muted-foreground">
                          {VEHICLE_LABELS[v.vehicleType] ?? v.vehicleType}
                        </span>
                        <span className="font-semibold text-foreground">
                          {v.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Peak Hours */}
          {d.peakHours.some((h) => h.count > 0) && (
            <Card>
              <CardHeader className="px-4 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <IconClock size={15} className="text-primary" /> Peak hours
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2">
                <ChartContainer config={peakConfig} className="h-36 w-full">
                  <BarChart data={d.peakHours} margin={{ left: 0, right: 0 }}>
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9 }}
                      tickFormatter={(h) => (h % 6 === 0 ? `${h}h` : "")}
                    />
                    <YAxis hide />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _, props) => [
                            value,
                            `${props.payload.hour}:00 – ${props.payload.hour + 1}:00`,
                          ]}
                          hideLabel
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Staff Performance */}
          {d.staffPerformance.length > 0 && (
            <Card>
              <CardHeader className="px-4 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <IconUsers size={15} className="text-primary" /> Staff
                  performance
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 divide-y divide-border">
                <div className="grid grid-cols-4 pb-2">
                  {["Name", "Check-ins", "Check-outs", "Approvals"].map((h) => (
                    <p
                      key={h}
                      className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </p>
                  ))}
                </div>
                {d.staffPerformance.map((m) => (
                  <div
                    key={m.staffMemberId}
                    className="grid grid-cols-4 py-3 items-center"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.name}
                    </p>
                    <p className="text-sm text-foreground">{m.checkIns}</p>
                    <p className="text-sm text-foreground">{m.checkOuts}</p>
                    <p className="text-sm text-foreground">{m.approvals}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
