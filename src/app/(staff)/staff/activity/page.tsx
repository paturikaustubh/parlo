"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import useSWRInfinite from "swr/infinite";
import { SessionDetailSheet } from "@/components/shared/session-detail-sheet";
import { type PricingRule } from "@/components/user/pricing-grid";
import { apiFetch } from "@/lib/api-client";
import { pageFetcher } from "@/lib/swr-fetcher";
import { usePaginationParams } from "@/lib/use-pagination-params";
import { FilterDialog } from "@/components/shared/filter-dialog";
import { ActiveFilterChips } from "@/components/shared/active-filter-chips";
import { Input } from "@/components/ui/input";
import { IconSearch } from "@tabler/icons-react";
import { useTimeFormat } from "@/hooks/use-time-format";
import {
  formatTime,
  formatDuration,
  formatAmount,
  TYPE_TO_SHORT,
  VEHICLE_TYPE_OPTIONS,
} from "@/lib/vehicle-utils";
import type { ParkingSession } from "@/shared/types/entities";
import { cn } from "@/lib/utils";

type ActionType = "checkin" | "checkout" | "both";

interface ActionedSession extends ParkingSession {
  actionType: ActionType;
  estimatedAmountPaise?: number | null;
}

const ACTION_TYPE_OPTIONS = [
  { label: "↓ Check-in", value: "checkin" },
  { label: "↑ Check-out", value: "checkout" },
  { label: "↕ Check in & out", value: "both" },
];

const FILTER_DEFAULTS = { actionType: "", vehicleType: "" };
const FILTER_LABELS = { actionType: "Action", vehicleType: "Type" };
const FILTER_OPTION_LABELS = {
  actionType: Object.fromEntries(
    ACTION_TYPE_OPTIONS.map((o) => [o.value, o.label]),
  ),
  vehicleType: Object.fromEntries(
    VEHICLE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
  ),
};

const ACTION_CONFIG: Record<ActionType, { label: string; className: string }> =
  {
    checkin: {
      label: "↓ Check-in",
      className:
        "border border-emerald-500/30 bg-emerald-500/8 text-emerald-500",
    },
    checkout: {
      label: "↑ Check-out",
      className: "border border-amber-500/30 bg-amber-500/8 text-amber-500",
    },
    both: {
      label: "↕ Check in & out",
      className: "border border-primary/30 bg-primary/8 text-primary",
    },
  };

function getTimeDisplay(session: ParkingSession, use12: boolean): string {
  if (!session.checkedOutAt) {
    return `In: ${formatTime(session.checkedInAt, use12)} · Active`;
  }
  return `${formatTime(session.checkedInAt, use12)} → ${formatTime(session.checkedOutAt, use12)} · ${formatDuration(session.durationMinutes)}`;
}

interface ActionedResponse {
  data: ActionedSession[];
  total: number;
  page: number;
  pageSize: number;
  lastPage: number;
}

function ActivityInner() {
  const { use12 } = useTimeFormat();
  const [selected, setSelected] = useState<ActionedSession | null>(null);
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

  const { get, setParams } = usePaginationParams();
  const search = get("search", "");
  const actionType = get("actionType", "");
  const vehicleType = get("vehicleType", "");

  const [highlightedDates, setHighlightedDates] = useState<Set<string>>(
    new Set(),
  );

  function toggleHighlight(dateKey: string) {
    setHighlightedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  const PAGE_SIZE = 25;

  function groupByDate(
    list: ActionedSession[],
  ): { dateKey: string; dateLabel: string; sessions: ActionedSession[] }[] {
    const order: string[] = [];
    const labels: Record<string, string> = {};
    const map: Record<string, ActionedSession[]> = {};
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

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(val: string) {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setParams({ search: val });
    }, 400);
  }

  const getKey = (
    pageIndex: number,
    previousPageData: ActionedResponse | null,
  ): [string, Record<string, unknown>] | null => {
    if (previousPageData && pageIndex + 1 > previousPageData.lastPage)
      return null;
    return [
      "/staff/me/actioned-sessions",
      {
        search,
        actionType,
        vehicleType,
        page: pageIndex + 1,
        pageSize: PAGE_SIZE,
      },
    ];
  };

  const {
    data: pages,
    isLoading,
    isValidating,
    setSize,
  } = useSWRInfinite<ActionedResponse>(getKey, pageFetcher, {
    revalidateFirstPage: false,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const hasMore =
      !!pages &&
      pages[pages.length - 1].page < pages[pages.length - 1].lastPage;
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
  }, [pages, isValidating, setSize]);

  const sessions = pages?.flatMap((p) => p.data) ?? [];
  const total = pages?.[0]?.total ?? 0;
  const hasMore =
    !!pages && pages[pages.length - 1].page < pages[pages.length - 1].lastPage;
  const isLoadingMore = isValidating && !!pages;
  const grouped = groupByDate(sessions);

  const totalRevenuePaise = sessions.reduce(
    (sum, s) => sum + (s.amountPaise ?? 0),
    0,
  );
  const checkinCount = sessions.filter(
    (s) => s.actionType === "checkin" || s.actionType === "both",
  ).length;
  const checkoutCount = sessions.filter(
    (s) => s.actionType === "checkout" || s.actionType === "both",
  ).length;

  // Fetch session-specific pricing version when a session is selected
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
      formulaType: string | null;
      cycleDurationHours: number | null;
      overflowIntervalMinutes: number | null;
      overflowAmountPaise: number | null;
      since: string | null;
      until: string | null;
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">Your handled sessions</p>
        <h1 className="font-heading font-bold text-xl text-foreground">
          Activity
        </h1>
      </div>

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
              key: "actionType",
              label: "Action type",
              defaultValue: "",
              options: ACTION_TYPE_OPTIONS,
              className: "col-span-1",
            },
            {
              key: "vehicleType",
              label: "Vehicle type",
              defaultValue: "",
              options: [...VEHICLE_TYPE_OPTIONS],
              className: "col-span-1",
            },
          ]}
          values={{ actionType, vehicleType }}
          onApply={(vals) => {
            setParams({
              actionType: vals.actionType ?? "",
              vehicleType: vals.vehicleType ?? "",
            });
          }}
        />
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        filters={{ actionType, vehicleType }}
        defaults={FILTER_DEFAULTS}
        labels={FILTER_LABELS}
        optionLabels={FILTER_OPTION_LABELS}
        onRemove={(key) => setParams({ [key]: "" })}
      />

      {/* Summary bar */}
      {sessions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Sessions", value: String(total) },
            {
              label: "Check-ins",
              value: String(checkinCount),
              green: checkinCount > 0,
            },
            { label: "Check-outs", value: String(checkoutCount) },
            {
              label: "Revenue",
              value: formatAmount(totalRevenuePaise),
              highlight: true,
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed">
          <p className="text-sm text-muted-foreground">
            No sessions handled yet
          </p>
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
            return (
              <div
                key={dateKey}
                className={`rounded-xl transition-colors duration-200 ${
                  highlightedDates.has(dateKey) ? "bg-primary/30 p-3" : ""
                }`}
              >
                {/* Sticky date header */}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {group.map((s) => {
                    const config = ACTION_CONFIG[s.actionType];
                    const timeDisplay = getTimeDisplay(s, use12);
                    const amountNode =
                      s.status === "ACTIVE"
                        ? s.estimatedAmountPaise != null && (
                            <span className="text-primary font-semibold tabular-nums">
                              {formatAmount(s.estimatedAmountPaise)} est.
                            </span>
                          )
                        : s.amountPaise != null && (
                            <span className="text-primary font-semibold tabular-nums">
                              {formatAmount(s.amountPaise)}
                            </span>
                          );

                    return (
                      <button
                        key={`${s.parkingSessionId}-${s.actionType}`}
                        type="button"
                        onClick={() => setSelected(s)}
                        className="text-left rounded-xl border border-border bg-card px-3.5 pt-3 pb-3.5 hover:border-primary/30 transition-colors flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-bold text-[15px] text-foreground">
                              {s.vehicleNumber}
                            </span>
                            <span
                              className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                                config.className,
                              )}
                            >
                              {config.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                            {TYPE_TO_SHORT[s.vehicleType] ?? s.vehicleType}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] text-muted-foreground truncate">
                            {timeDisplay}
                          </p>
                          {amountNode && (
                            <span className="text-[13px] shrink-0">
                              {amountNode}
                            </span>
                          )}
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

export default function StaffActivityPage() {
  return (
    <Suspense>
      <ActivityInner />
    </Suspense>
  );
}
