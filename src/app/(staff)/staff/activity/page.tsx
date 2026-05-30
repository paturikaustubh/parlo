"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import useSWR from "swr";
import { SessionDetailSheet } from "@/components/shared/session-detail-sheet";
import { type PricingRule } from "@/components/user/pricing-grid";
import { apiFetch } from "@/lib/api-client";
import { pageFetcher } from "@/lib/swr-fetcher";
import { usePaginationParams } from "@/lib/use-pagination-params";
import { Pagination } from "@/components/shared/pagination";
import {
  FilterDialog,
  type FilterField,
} from "@/components/shared/filter-dialog";
import { ActiveFilterChips } from "@/components/shared/active-filter-chips";
import { Input } from "@/components/ui/input";
import { IconSearch } from "@tabler/icons-react";
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

function getTimeDisplay(session: ParkingSession): string {
  if (!session.checkedOutAt) {
    return `In: ${formatTime(session.checkedInAt)} · Active`;
  }
  return `${formatTime(session.checkedInAt)} → ${formatTime(session.checkedOutAt)} · ${formatDuration(session.durationMinutes)}`;
}

interface ActionedResponse {
  data: ActionedSession[];
  total: number;
  page: number;
  pageSize: number;
  lastPage: number;
}

function ActivityInner() {
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

  const { get, getInt, setParam, setParams } = usePaginationParams();
  const search = get("search", "");
  const actionType = get("actionType", "");
  const vehicleType = get("vehicleType", "");
  const page = getInt("page", 1);
  const pageSize = getInt("pageSize", 20);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(val: string) {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setParams({ search: val, page: 1 });
    }, 400);
  }

  const { data, isLoading } = useSWR<ActionedResponse>(
    [
      "/staff/me/actioned-sessions",
      { search, actionType, vehicleType, page, pageSize },
    ],
    pageFetcher,
  );

  const sessions = data?.data ?? [];
  const total = data?.total ?? 0;
  const lastPage = data?.lastPage ?? 1;

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
              page: 1,
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
        onRemove={(key) => setParams({ [key]: "", page: 1 })}
      />

      {/* List */}
      {isLoading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <>
          <div
            className={`transition-opacity duration-150 ${isLoading && !!data ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sessions.map((s) => {
                const config = ACTION_CONFIG[s.actionType];
                const timeDisplay = getTimeDisplay(s);
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
                        <span className="font-mono font-bold text-sm text-foreground">
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
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                        {TYPE_TO_SHORT[s.vehicleType] ?? s.vehicleType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground truncate">
                        {timeDisplay}
                      </p>
                      {amountNode && (
                        <span className="text-[11px] shrink-0">
                          {amountNode}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {sessions.length > 0 && (
            <Pagination
              className="mt-4"
              page={page}
              lastPage={lastPage}
              pageSize={pageSize}
              loading={isLoading}
              onPageChange={(p) => setParam("page", p)}
              onPageSizeChange={(s) => setParam("pageSize", s)}
              onRefresh={() => {}}
            />
          )}
        </>
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
