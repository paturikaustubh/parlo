"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import { Input } from "@/components/ui/input";
import { IconCar, IconSearch } from "@tabler/icons-react";
import { FilterDialog } from "@/components/shared/filter-dialog";
import { ActiveFilterChips } from "@/components/shared/active-filter-chips";
import { apiFetch } from "@/lib/api-client";
import { pageFetcher } from "@/lib/swr-fetcher";
import { usePaginationParams } from "@/lib/use-pagination-params";
import {
  formatAmount,
  formatDuration,
  TYPE_TO_SHORT,
} from "@/lib/vehicle-utils";
import { SpaceFilterBanner } from "@/components/owner/space-filter-banner";
import { type PricingRule } from "@/components/user/pricing-grid";
import { SessionDetailSheet } from "@/components/shared/session-detail-sheet";
import type { ParkingSession, Space } from "@/shared/types/entities";

interface PagedSessions {
  data: ParkingSession[];
  total: number;
  page: number;
  pageSize: number;
  lastPage: number;
}

export default function OwnerSessionsPage() {
  const searchParams = useSearchParams();
  const spaceIdFromUrl = searchParams.get("space");

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selected, setSelected] = useState<ParkingSession | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [pricingSince, setPricingSince] = useState<string | null>(null);
  const [pricingUntil, setPricingUntil] = useState<string | null>(null);
  const [pricingFormulaType, setPricingFormulaType] = useState<string | null>(
    null,
  );
  const [pricingCycleDurationHours, setPricingCycleDurationHours] = useState<
    number | null
  >(null);
  const [pricingOverflowIntervalMinutes, setPricingOverflowIntervalMinutes] =
    useState<number | null>(null);
  const [pricingOverflowAmountPaise, setPricingOverflowAmountPaise] = useState<
    number | null
  >(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // URL-synced filter + pagination state
  const PAGE_SIZE = 25;

  const { get, setParams } = usePaginationParams();
  const filterSpace = get("spaceId", spaceIdFromUrl ?? "");
  const filterStatus = get("status", "");
  const search = get("search", "");
  const fromDate = get("from", "");
  const toDate = get("to", "");

  // Debounced search
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(val: string) {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setParams({ search: val });
    }, 400);
  }

  // Fetch pricing when session selected
  useEffect(() => {
    if (!selected) return;
    setPricingRules([]);
    setPricingSince(null);
    setPricingUntil(null);
    setPricingFormulaType(null);
    setPricingCycleDurationHours(null);
    setPricingOverflowIntervalMinutes(null);
    setPricingOverflowAmountPaise(null);
    setPricingLoading(true);
    apiFetch<{
      rules: PricingRule[];
      since: string | null;
      until: string | null;
      formulaType: string | null;
      cycleDurationHours: number | null;
      overflowIntervalMinutes: number | null;
      overflowAmountPaise: number | null;
    }>(`/sessions/${selected.parkingSessionId}/pricing`)
      .then((d) => {
        setPricingRules(d.rules);
        setPricingSince(d.since);
        setPricingUntil(d.until);
        setPricingFormulaType(d.formulaType);
        setPricingCycleDurationHours(d.cycleDurationHours);
        setPricingOverflowIntervalMinutes(d.overflowIntervalMinutes);
        setPricingOverflowAmountPaise(d.overflowAmountPaise);
      })
      .catch(() => {})
      .finally(() => setPricingLoading(false));
  }, [selected?.parkingSessionId]);

  // Live clock for active session duration
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function liveDuration(checkedInAt: string): string {
    const secs = Math.max(
      0,
      Math.floor((now - new Date(checkedInAt).getTime()) / 1000),
    );
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function groupSessionsByDate(
    list: ParkingSession[],
  ): { dateKey: string; dateLabel: string; sessions: ParkingSession[] }[] {
    const order: string[] = [];
    const labels: Record<string, string> = {};
    const map: Record<string, ParkingSession[]> = {};
    const todayKey = new Date().toDateString();

    for (const s of list) {
      const dt = new Date(s.checkedOutAt ?? s.checkedInAt);
      const key = dt.toDateString();
      if (!map[key]) {
        order.push(key);
        map[key] = [];
        labels[key] =
          key === todayKey
            ? "Today"
            : dt
                .toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                })
                .toUpperCase();
      }
      map[key].push(s);
    }

    return order.map((key) => ({
      dateKey: key,
      dateLabel: labels[key],
      sessions: map[key],
    }));
  }

  // Spaces list (for filter dropdown)
  useEffect(() => {
    apiFetch<Space[]>("/spaces")
      .then(setSpaces)
      .catch(() => {});
  }, []);

  // SWR-powered sessions fetch
  const getKey = (
    pageIndex: number,
    previousPageData: PagedSessions | null,
  ): [string, Record<string, unknown>] | null => {
    if (previousPageData && pageIndex + 1 > previousPageData.lastPage)
      return null;
    return [
      "/owner/sessions",
      {
        page: pageIndex + 1,
        pageSize: PAGE_SIZE,
        spaceId: filterSpace,
        status: filterStatus,
        search,
        from: fromDate ? new Date(fromDate).toISOString() : "",
        to: toDate ? new Date(toDate + "T23:59:59").toISOString() : "",
      },
    ];
  };

  const {
    data: pages,
    isLoading,
    isValidating,
    setSize,
    mutate,
  } = useSWRInfinite<PagedSessions>(getKey, pageFetcher, {
    revalidateFirstPage: false,
  });

  const sessions: ParkingSession[] = pages?.flatMap((p) => p.data) ?? [];
  const total = pages?.[0]?.total ?? 0;
  const hasMore =
    !!pages && pages[pages.length - 1].page < pages[pages.length - 1].lastPage;
  const isLoadingMore = isValidating && !!pages;

  // Sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isValidating) {
          setSize((s) => s + 1);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isValidating, setSize]);

  const totalRevenuePaise = sessions.reduce(
    (sum, s) => sum + (s.amountPaise ?? 0),
    0,
  );
  const activeCount = sessions.filter(
    (s) => s.status === "ACTIVE" || s.status === "CHECKOUT_REQUESTED",
  ).length;
  const completedWithDuration = sessions.filter(
    (s) => s.durationMinutes != null,
  );
  const avgDurationMins =
    completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce(
            (sum, s) => sum + (s.durationMinutes ?? 0),
            0,
          ) / completedWithDuration.length,
        )
      : null;
  const grouped = groupSessionsByDate(sessions);

  const [highlightedDates, setHighlightedDates] = useState<Set<string>>(
    new Set(),
  );

  function toggleHighlight(dateKey: string) {
    setHighlightedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  const spaceName = spaces.find((s) => s.spaceId === spaceIdFromUrl)?.name;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-xl text-foreground tracking-tight">
          Sessions
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} total</p>
      </div>

      <SpaceFilterBanner spaceName={spaceName} />

      {/* Search + filter row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            defaultValue={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search plate, name, phone…"
            className="pl-8 h-9 text-sm"
          />
        </div>
        <FilterDialog
          fields={[
            {
              key: "spaceId",
              label: "Space",
              options: spaces.map((s) => ({ label: s.name, value: s.spaceId })),
              className: "col-span-1",
            },
            {
              key: "status",
              label: "Status",
              options: [
                { label: "Active", value: "ACTIVE" },
                { label: "Completed", value: "COMPLETED" },
                { label: "Checkout requested", value: "CHECKOUT_REQUESTED" },
              ],
              className: "col-span-1",
            },
            {
              key: "from",
              label: "From",
              type: "date",
              className: "col-span-1",
            },
            { key: "to", label: "To", type: "date", className: "col-span-1" },
          ]}
          values={{
            spaceId: filterSpace,
            status: filterStatus,
            from: fromDate,
            to: toDate,
          }}
          onApply={(vals) =>
            setParams({
              spaceId: vals.spaceId ?? "",
              status: vals.status ?? "",
              from: vals.from ?? "",
              to: vals.to ?? "",
            })
          }
        />
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        filters={{
          spaceId: filterSpace,
          status: filterStatus,
          from: fromDate,
          to: toDate,
        }}
        defaults={{ spaceId: "", status: "", from: "", to: "" }}
        labels={{ spaceId: "Space", status: "Status", from: "From", to: "To" }}
        optionLabels={{
          spaceId: Object.fromEntries(spaces.map((s) => [s.spaceId, s.name])),
          status: {
            ACTIVE: "Active",
            COMPLETED: "Completed",
            CHECKOUT_REQUESTED: "Checkout req.",
          },
          from: {},
          to: {},
        }}
        onRemove={(key) => setParams({ [key]: "" })}
      />

      {/* Summary chips */}
      {sessions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[
            {
              label: "Revenue",
              value: formatAmount(totalRevenuePaise),
              highlight: true,
            },
            {
              label: "Avg duration",
              value:
                avgDurationMins != null ? formatDuration(avgDurationMins) : "—",
            },
            {
              label: "Active now",
              value: String(activeCount),
              green: activeCount > 0,
            },
          ].map(({ label, value, highlight, green }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-lg px-3.5 py-2.5 flex flex-col gap-0.5"
            >
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                {label}
              </span>
              <span
                className={`text-[15px] font-bold leading-none tabular-nums ${
                  highlight
                    ? "text-primary"
                    : green
                      ? "text-primary"
                      : "text-foreground"
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading && !pages ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <IconCar size={32} className="text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No sessions found</p>
        </div>
      ) : (
        <div
          className={`transition-opacity duration-150 space-y-6 ${isLoading && !!pages ? "opacity-50 pointer-events-none" : ""}`}
        >
          {grouped.map(({ dateKey, dateLabel, sessions: group }) => {
            const groupRevenue = group.reduce(
              (sum, s) => sum + (s.amountPaise ?? 0),
              0,
            );
            const cols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

            return (
              <div
                key={dateKey}
                className={`rounded-xl transition-colors duration-200 ${
                  highlightedDates.has(dateKey) ? "bg-primary/30 p-3" : ""
                }`}
              >
                {/* Date header — sticky + clickable toggle */}
                <div className="sticky top-0 z-10 pb-2.5">
                  <div className="flex items-center justify-between w-full group">
                    <button
                      type="button"
                      onClick={() => toggleHighlight(dateKey)}
                      className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                        highlightedDates.has(dateKey)
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {dateLabel}
                    </button>
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <span>
                        {group.length} session{group.length !== 1 ? "s" : ""}
                      </span>
                      {groupRevenue > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-primary font-semibold tabular-nums">
                            {formatAmount(groupRevenue)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cards */}
                <div className={`grid ${cols} gap-3`}>
                  {group.map((s) => {
                    const isActive =
                      s.status === "ACTIVE" ||
                      s.status === "CHECKOUT_REQUESTED";
                    const amount =
                      s.status === "ACTIVE" &&
                      (s as any).estimatedAmountPaise != null
                        ? `${formatAmount((s as any).estimatedAmountPaise)} est.`
                        : s.amountPaise != null
                          ? formatAmount(s.amountPaise)
                          : "—";
                    const duration =
                      s.status === "ACTIVE"
                        ? liveDuration(s.checkedInAt)
                        : s.durationMinutes
                          ? formatDuration(s.durationMinutes)
                          : "—";
                    const displayTime = formatTime(
                      s.checkedOutAt ?? s.checkedInAt,
                    );

                    return (
                      <button
                        key={s.parkingSessionId}
                        type="button"
                        onClick={() => setSelected(s)}
                        className="text-left rounded-xl border border-border bg-card px-3.5 pt-3 pb-3.5 hover:border-primary/30 transition-colors"
                      >
                        {/* Header: plate ← → type */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isActive
                                  ? "bg-primary animate-pulse"
                                  : "bg-muted-foreground/30"
                              }`}
                            />
                            <span className="font-mono font-bold text-[15px] text-foreground truncate">
                              {s.vehicleNumber}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                            {TYPE_TO_SHORT[s.vehicleType] ?? s.vehicleType}
                          </span>
                        </div>

                        {/* Space + time */}
                        <p className="text-[12px] text-muted-foreground">
                          {s.space.name} · {displayTime}
                          {s.guestName && " · Guest"}
                          {s.isOnBehalf && " · On-behalf"}
                        </p>

                        {/* Duration + amount */}
                        <div className="flex items-center justify-between gap-2 mt-1.5">
                          <span className="text-[12px] text-muted-foreground tabular-nums">
                            {duration}
                          </span>
                          <span className="text-[13px] font-semibold text-primary tabular-nums shrink-0">
                            {amount}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-primary animate-spin" />
        </div>
      )}
      {!hasMore && sessions.length > 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">
          All sessions loaded
        </p>
      )}

      {/* Detail Sheet */}
      <SessionDetailSheet
        session={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        pricingRules={pricingRules}
        pricingLoading={pricingLoading}
        pricingSince={pricingSince}
        pricingUntil={pricingUntil}
        pricingFormulaType={pricingFormulaType}
        pricingCycleDurationHours={pricingCycleDurationHours}
        pricingOverflowIntervalMinutes={pricingOverflowIntervalMinutes}
        pricingOverflowAmountPaise={pricingOverflowAmountPaise}
      />
    </div>
  );
}
