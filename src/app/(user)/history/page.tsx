"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { SessionDetailSheet } from "@/components/shared/session-detail-sheet";
import {
  FilterDialog,
  type FilterField,
} from "@/components/shared/filter-dialog";
import { ActiveFilterChips } from "@/components/shared/active-filter-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSearch } from "@tabler/icons-react";
import {
  formatAmount,
  formatDate,
  formatDuration,
  TYPE_TO_SHORT,
  VEHICLE_TYPE_OPTIONS,
} from "@/lib/vehicle-utils";
import { usePaginationParams } from "@/lib/use-pagination-params";
import useSWR from "swr";
import { pageFetcher } from "@/lib/swr-fetcher";
import { Pagination } from "@/components/shared/pagination";
import type { ParkingSession, Space } from "@/shared/types/entities";
import type { PricingRule } from "@/components/user/pricing-grid";

const FILTER_DEFAULTS = { vehicleType: "", spaceId: "", from: "", to: "" };
const FILTER_LABELS = {
  vehicleType: "Type",
  spaceId: "Space",
  from: "From",
  to: "To",
};

interface PagedSessions {
  data: ParkingSession[];
  total: number;
  page: number;
  pageSize: number;
  lastPage: number;
}

function HistoryInner() {
  const { get, getInt, setParam, setParams } = usePaginationParams();
  const page = getInt("page", 1);
  const pageSize = getInt("pageSize", 20);
  const search = get("search", "");
  const vehicleType = get("vehicleType", "");
  const spaceId = get("spaceId", "");
  const fromDate = get("from", "");
  const toDate = get("to", "");

  const [spaces, setSpaces] = useState<Space[]>([]);

  // Pricing state for SessionDetailSheet
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

  // SWR-powered sessions fetch
  const { data, isLoading, mutate } = useSWR<PagedSessions>(
    [
      "/sessions",
      {
        status: "COMPLETED",
        page,
        pageSize,
        search,
        vehicleType,
        spaceId: spaceId === "all" ? "" : spaceId,
        from: fromDate ? new Date(fromDate).toISOString() : "",
        to: toDate ? new Date(toDate + "T23:59:59").toISOString() : "",
      },
    ],
    pageFetcher,
  );

  const sessions = data?.data ?? [];
  const total = data?.total ?? 0;
  const lastPage = data?.lastPage ?? 1;

  useEffect(() => {
    apiFetch<Space[]>("/spaces")
      .then(setSpaces)
      .catch(() => {});
  }, []);

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

  // Debounced search
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(val: string) {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setParam("search", val);
    }, 400);
  }

  const filterFields: FilterField[] = [
    {
      key: "vehicleType",
      label: "Vehicle type",
      defaultValue: "",
      options: [...VEHICLE_TYPE_OPTIONS],
      className: "col-span-1",
    },
    {
      key: "spaceId",
      label: "Space",
      defaultValue: "",
      options: [...spaces.map((s) => ({ label: s.name, value: s.spaceId }))],
      className: "col-span-1",
    },
    {
      key: "from",
      label: "From",
      type: "date",
      defaultValue: "",
      className: "col-span-1",
    },
    {
      key: "to",
      label: "To",
      type: "date",
      defaultValue: "",
      className: "col-span-1",
    },
  ];

  const filterValues = {
    vehicleType,
    spaceId: spaceId === "all" ? "" : spaceId,
    from: fromDate,
    to: toDate,
  };

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-xl text-foreground">
        History
      </h1>

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
            placeholder="Search plate, name, space…"
            className="pl-8 h-9 text-sm"
          />
          {isLoading && !data && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              Searching…
            </span>
          )}
        </div>
        <FilterDialog
          fields={filterFields}
          values={filterValues}
          onApply={(vals) =>
            setParams({
              vehicleType: vals.vehicleType ?? "",
              spaceId: vals.spaceId ?? "",
              from: vals.from ?? "",
              to: vals.to ?? "",
              page: 1,
            })
          }
        />
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        filters={filterValues}
        defaults={FILTER_DEFAULTS}
        labels={FILTER_LABELS}
        optionLabels={{
          vehicleType: Object.fromEntries(
            VEHICLE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
          ),
          spaceId: Object.fromEntries(spaces.map((s) => [s.spaceId, s.name])),
          from: {},
          to: {},
        }}
        onRemove={(key) => setParam(key, "")}
      />

      {/* Card grid */}
      {isLoading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No sessions found</p>
        </div>
      ) : (
        <>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 transition-opacity ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
          >
            {sessions.map((s) => {
              const hasNickname = !!s.vehicleNickname;
              return (
                <button
                  key={s.parkingSessionId}
                  type="button"
                  onClick={() => setSelected(s)}
                  className="text-left rounded-xl border border-border bg-card px-3.5 pt-3 pb-3.5 hover:border-primary/40 hover:bg-card/80 transition-colors"
                >
                  {/* Title: nickname or plate */}
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-foreground leading-tight truncate">
                      {s.vehicleNickname ?? s.vehicleNumber}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground shrink-0 mt-0.5">
                      {TYPE_TO_SHORT[s.vehicleType] ?? s.vehicleType}
                    </span>
                  </div>
                  {/* Plate as subtitle if nickname exists */}
                  {hasNickname && (
                    <p className="font-mono text-[11px] text-muted-foreground mb-1 leading-none">
                      {s.vehicleNumber}
                    </p>
                  )}
                  {/* Space name */}
                  <p className="text-[11px] text-muted-foreground truncate mt-1">
                    {s.space.name}
                  </p>
                  {/* Date · duration · amount */}
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(s.checkedInAt)} ·{" "}
                      {formatDuration(s.durationMinutes)}
                    </p>
                    <span className="text-[11px] font-semibold text-primary shrink-0 tabular-nums">
                      {formatAmount(s.amountPaise)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <Pagination
            className="mt-4"
            page={page}
            lastPage={lastPage}
            pageSize={pageSize}
            loading={isLoading}
            onPageChange={(p) => setParam("page", p)}
            onPageSizeChange={(s) => setParam("pageSize", s)}
            onRefresh={() => mutate()}
          />
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

export default function HistoryPage() {
  return (
    <Suspense>
      <HistoryInner />
    </Suspense>
  );
}
