"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconMapPin,
  IconUsers,
  IconTicket,
  IconListCheck,
  IconChartBar,
  IconFileText,
  IconCreditCard,
  IconRadio,
  IconCar,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { formatAmount } from "@/lib/vehicle-utils";
import type { Space } from "@/shared/types/entities";
import { ParkingStatusCard } from "@/components/shared/parking-status-card";

interface DashboardStats {
  totalRevenuePaise: number;
  currentlyParked: number;
  onDutyStaff: number;
  activeRequests: number;
  byType?: Record<string, number>;
}

const QUICK_LINKS = [
  { href: "/owner/sessions", label: "Sessions", icon: IconTicket },
  { href: "/owner/queue", label: "Queue", icon: IconListCheck },
  { href: "/owner/staff", label: "Staff", icon: IconUsers },
  { href: "/owner/reports", label: "Reports", icon: IconChartBar },
  { href: "/owner/activity", label: "Activity", icon: IconFileText },
  { href: "/owner/subscription", label: "Subscription", icon: IconCreditCard },
];

function startOfDayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const cache = useRef<DashboardStats | null>(null);

  useEffect(() => {
    if (cache.current) {
      setStats(cache.current);
      setLoading(false);
    }

    async function load() {
      const [statsRes, spacesRes] = await Promise.allSettled([
        apiFetch<DashboardStats>(
          `/analytics/me?from=${encodeURIComponent(startOfDayISO())}`,
        ),
        apiFetch<Space[]>("/spaces"),
      ]);
      if (statsRes.status === "fulfilled") {
        cache.current = statsRes.value;
        setStats(statsRes.value);
      }
      if (spacesRes.status === "fulfilled") setSpaces(spacesRes.value);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your business at a glance
          </p>
        </div>
      </div>

      {/* Live stats */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Live
        </p>
        <div className="grid grid-cols-2 gap-3">
          {loading && !stats
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-muted animate-pulse"
                />
              ))
            : [
                {
                  label: "Parked now",
                  value: String(stats?.currentlyParked ?? 0),
                  icon: IconCar,
                },
                {
                  label: "Requests",
                  value: String(stats?.activeRequests ?? 0),
                  icon: IconListCheck,
                },
                {
                  label: "On duty",
                  value: String(stats?.onDutyStaff ?? 0),
                  icon: IconUsers,
                },
                {
                  label: "Today revenue",
                  value: formatAmount(stats?.totalRevenuePaise ?? 0),
                  icon: IconChartBar,
                },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <CardContent>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </p>
                      <Icon size={13} className="text-muted-foreground" />
                    </div>
                    <p className="font-heading font-bold text-2xl text-foreground leading-none">
                      {value}
                    </p>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>

      {/* Parking Status Card */}
      {stats && (
        <ParkingStatusCard
          totalParked={stats.currentlyParked}
          byType={stats.byType ?? {}}
          lotHref="/owner/vehicles"
        />
      )}

      {/* Spaces */}
      {spaces.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Spaces
          </p>
          <div className="space-y-2">
            {spaces.map((space) => (
              <Card key={space.spaceId}>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <IconMapPin size={15} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/owner/spaces/${space.spaceId}`}
                        className="text-sm font-semibold text-foreground truncate hover:text-primary underline underline-offset-1 transition-colors"
                      >
                        {space.name}
                      </Link>
                      {space.address && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {space.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    asChild
                  >
                    <Link href={`/owner/spaces/${space.spaceId}/operate`}>
                      <IconRadio size={13} className="text-primary" />
                      Operate
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick access */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Quick access
        </p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="group">
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="py-3 px-3 flex flex-col items-center gap-1.5 text-center">
                  <Icon
                    size={18}
                    className="text-muted-foreground group-hover:text-primary transition-colors"
                    strokeWidth={1.8}
                  />
                  <p className="text-xs font-medium text-foreground leading-tight">
                    {label}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
