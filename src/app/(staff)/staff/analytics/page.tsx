"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month";

interface Metrics {
  period: string;
  checkIns: number;
  checkOuts: number;
  currentlyParked: number;
  approvalRate: number;
  shiftHoursToday: number;
  isOnDuty: boolean;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
];

export default function StaffAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Metrics>(`/staff/me/metrics?period=${period}`)
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const kpis = metrics
    ? [
        { label: "Check-ins", value: metrics.checkIns },
        { label: "Check-outs", value: metrics.checkOuts },
        { label: "Approval rate", value: `${metrics.approvalRate}%` },
        { label: "Shift hours", value: `${metrics.shiftHoursToday}h` },
      ]
    : [];

  return (
    <div className="space-y-5">
      <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
        Analytics
      </h1>

      {/* Period selector */}
      <div className="flex bg-muted rounded-xl p-1 gap-1">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
              period === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {kpis.map(({ label, value }) => (
            <Card key={label}>
              <CardContent>
                <p className="text-2xl font-heading font-bold text-primary">
                  {value}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
