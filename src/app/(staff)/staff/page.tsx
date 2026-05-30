"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast";
import { IconMapPin, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { useStaff } from "@/contexts/staff-context";
import { cn } from "@/lib/utils";
import { ParkingStatusCard } from "@/components/shared/parking-status-card";

interface Metrics {
  checkIns: number;
  checkOuts: number;
  currentlyParked: number;
  shiftHoursToday: number;
  isOnDuty: boolean;
  dutyStartedAt: string | null;
  byType?: Record<string, number>;
}

interface ActivityItem {
  sessionId: string;
  vehicleNumber: string;
  action: "checkin" | "checkout";
  timestamp: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function StaffDashboard() {
  const { staffMember, setStaffMember } = useStaff();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    const [m, a] = await Promise.allSettled([
      apiFetch<Metrics>("/staff/me/metrics?period=today"),
      apiFetch<ActivityItem[]>("/staff/me/activity"),
    ]);
    if (m.status === "fulfilled") setMetrics(m.value);
    if (a.status === "fulfilled") setActivity(a.value);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDutyToggle() {
    if (!metrics) return;
    setToggling(true);
    try {
      await apiFetch("/staff/me", {
        method: "PATCH",
        body: JSON.stringify({ isOnDuty: !metrics.isOnDuty }),
      });
      const newDuty = !metrics.isOnDuty;
      await fetchData();
      setStaffMember((prev) => (prev ? { ...prev, isOnDuty: newDuty } : prev));
      showToast(
        newDuty ? "You are now on duty!" : "You are now off duty.",
        "success",
      );
    } catch {
      showToast("Failed to update duty status.", "error");
    } finally {
      setToggling(false);
    }
  }

  const spaceName = staffMember?.spaceId ? "Assigned space" : "All spaces";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h1 className="font-heading font-bold text-xl text-foreground">
            {staffMember?.user.name}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
          <IconMapPin size={11} />
          {spaceName}
        </div>
      </div>

      {/* Duty toggle */}
      <Card>
        <CardContent className="flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={toggling}
            onClick={handleDutyToggle}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all border-2 font-heading font-bold text-xs",
              metrics?.isOnDuty
                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50",
            )}
          >
            {metrics?.isOnDuty ? "ON" : "OFF"}
          </button>
          <p className="text-sm font-medium text-foreground">
            {metrics?.isOnDuty ? "On duty" : "Off duty"}
          </p>
          {metrics?.isOnDuty && metrics.dutyStartedAt && (
            <p className="text-xs text-muted-foreground">
              Since{" "}
              {new Date(metrics.dutyStartedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" · "}
              {metrics.shiftHoursToday.toFixed(1)}h
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {metrics?.isOnDuty ? "Tap to go off duty" : "Tap to start shift"}
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Check-ins", value: metrics?.checkIns ?? 0 },
          { label: "Check-outs", value: metrics?.checkOuts ?? 0 },
          { label: "Active now", value: metrics?.currentlyParked ?? 0 },
          {
            label: "Shift hours",
            value: metrics?.shiftHoursToday?.toFixed(1) ?? "0",
          },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent>
              <p className="text-2xl font-heading font-bold text-foreground">
                {value}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Parking Status Card */}
      {metrics && (
        <ParkingStatusCard
          totalParked={metrics.currentlyParked}
          byType={metrics.byType ?? {}}
          lotHref="/staff/vehicles"
        />
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Recent activity
            </p>
            <Link
              href="/staff/activity"
              className="text-xs text-primary hover:underline underline-offset-2"
            >
              View all →
            </Link>
          </div>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {activity.slice(0, 8).map((item) => (
                <div
                  key={item.sessionId}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                        item.action === "checkin"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-blue-500/10 text-blue-600",
                      )}
                    >
                      {item.action === "checkin" ? (
                        <IconArrowDown size={12} />
                      ) : (
                        <IconArrowUp size={12} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.vehicleNumber}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {item.action === "checkin"
                          ? "Checked in"
                          : "Checked out"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
