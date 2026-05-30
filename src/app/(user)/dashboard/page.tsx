"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveSessionCard } from "@/components/user/active-session-card";
import { StatCard } from "@/components/user/stat-card";
import { SessionRow } from "@/components/user/session-row";
import {
  IconQrcode,
  IconCar,
  IconParkingCircle,
  IconArrowRight,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import {
  formatAmount,
  formatDuration,
  formatDate,
  VEHICLE_ICONS,
  TYPE_TO_DISPLAY,
} from "@/lib/vehicle-utils";
import type { ParkingSession, Vehicle } from "@/shared/types/entities";

interface SessionWithEstimate extends ParkingSession {
  estimatedAmountPaise?: number;
}

interface PaginatedSessions {
  data: SessionWithEstimate[];
  total: number;
  page: number;
  pageSize: number;
}

export default function DashboardPage() {
  const [activeSessions, setActiveSessions] = useState<SessionWithEstimate[]>(
    [],
  );
  const [recentSessions, setRecentSessions] = useState<SessionWithEstimate[]>(
    [],
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [todaySpentPaise, setTodaySpentPaise] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeRes, recentRes, vehicleRes] = await Promise.allSettled([
        apiFetch<PaginatedSessions>("/sessions?status=ACTIVE&pageSize=10"),
        apiFetch<PaginatedSessions>("/sessions?status=COMPLETED&pageSize=3"),
        apiFetch<Vehicle[]>("/vehicles"),
      ]);

      if (activeRes.status === "fulfilled")
        setActiveSessions(activeRes.value.data);
      if (recentRes.status === "fulfilled") {
        const sessions = recentRes.value.data;
        setRecentSessions(sessions);
        const todayTotal = sessions
          .filter((s) => new Date(s.checkedInAt) >= today)
          .reduce((sum, s) => sum + (s.amountPaise ?? 0), 0);
        setTodaySpentPaise(todayTotal);
      }
      if (vehicleRes.status === "fulfilled") {
        setVehicles(vehicleRes.value.filter((v) => v.isActive));
      }
      setLoading(false);
    }

    async function refreshActive() {
      try {
        const res = await apiFetch<PaginatedSessions>(
          "/sessions?status=ACTIVE&pageSize=10",
        );
        setActiveSessions(res.data);
      } catch {
        /* silent */
      }
    }

    load();
    const interval = setInterval(refreshActive, 30_000);
    return () => clearInterval(interval);
  }, []);

  const hasActiveSessions = activeSessions.length > 0;
  const sessionCols = Math.min(activeSessions.length, 3);
  const sessionGridClass =
    sessionCols === 2
      ? "md:grid-cols-2"
      : sessionCols === 3
        ? "md:grid-cols-3"
        : "grid-cols-1";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── HERO ──────────────────────────────────────────── */}
      {hasActiveSessions ? (
        <div className={`grid grid-cols-1 gap-3 ${sessionGridClass}`}>
          {activeSessions.map((s) => (
            <ActiveSessionCard key={s.parkingSessionId} session={s} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Card className="col-span-1 bg-muted/40 border-dashed">
            <CardContent className="flex flex-col items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                <IconParkingCircle
                  size={18}
                  className="text-muted-foreground"
                />
              </div>
              <p className="text-xs font-medium text-muted-foreground leading-snug">
                No active sessions
              </p>
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                Ready for your next trip.
              </p>
            </CardContent>
          </Card>
          <Button
            asChild
            className="col-span-1 h-auto flex-col gap-2 py-5 text-sm"
          >
            <Link href="/scan">
              <IconQrcode size={26} />
              <span className="font-semibold">Scan QR</span>
              <span className="text-[10px] font-normal opacity-80">
                Point at entrance QR
              </span>
            </Link>
          </Button>
        </div>
      )}

      {/* ── TODAY'S OVERVIEW ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Spent today" value={formatAmount(todaySpentPaise)} />
        <StatCard
          label="Active sessions"
          value={String(activeSessions.length)}
        />
      </div>

      {/* ── RECENT SESSIONS ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">
              Recent sessions
            </CardTitle>
            <Link
              href="/history"
              className="text-xs text-primary flex items-center gap-0.5 hover:underline"
            >
              View all <IconArrowRight size={12} />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-4 divide-y divide-border">
          {recentSessions.length > 0 ? (
            recentSessions.map((s) => (
              <SessionRow
                key={s.parkingSessionId}
                spaceName={s.space.name}
                date={formatDate(s.checkedInAt)}
                duration={formatDuration(s.durationMinutes)}
                cost={
                  s.status === "ACTIVE" && s.estimatedAmountPaise != null
                    ? `${formatAmount(s.estimatedAmountPaise)} est.`
                    : formatAmount(s.amountPaise)
                }
                plate={s.vehicleNumber}
                status={s.status === "ACTIVE" ? "ACTIVE" : "COMPLETED"}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No sessions yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── MY VEHICLES ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">
              My vehicles
            </CardTitle>
            <Link
              href="/vehicles"
              className="text-xs text-primary flex items-center gap-0.5 hover:underline"
            >
              Manage <IconArrowRight size={12} />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-4 space-y-2">
          {vehicles.length > 0 ? (
            vehicles.slice(0, 3).map((v) => {
              const Icon = VEHICLE_ICONS[v.vehicleType];
              return (
                <div
                  key={v.vehicleId}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className="text-muted-foreground" />
                    <span className="font-mono font-bold text-sm text-foreground tracking-wider">
                      {v.vehicleNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {TYPE_TO_DISPLAY[v.vehicleType]}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <Button variant="outline" size="sm" className="w-full mt-1" asChild>
              <Link href="/vehicles">
                <IconCar size={15} /> Add a vehicle
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
