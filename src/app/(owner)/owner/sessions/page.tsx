"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { IconCar, IconSearch } from "@tabler/icons-react";
import {
  FilterDialog,
  type FilterField,
} from "@/components/shared/filter-dialog";
import { ActiveFilterChips } from "@/components/shared/active-filter-chips";
import { apiFetch } from "@/lib/api-client";
import { pageFetcher } from "@/lib/swr-fetcher";
import { usePaginationParams } from "@/lib/use-pagination-params";
import { Pagination } from "@/components/shared/pagination";
import {
  formatAmount,
  formatDuration,
  formatDate,
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
  const { get, getInt, setParam, setParams } = usePaginationParams();
  const page = getInt("page", 1);
  const pageSize = getInt("pageSize", 25);
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
      setParams({ search: val, page: 1 });
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

  // Spaces list (for filter dropdown)
  useEffect(() => {
    apiFetch<Space[]>("/spaces")
      .then(setSpaces)
      .catch(() => {});
  }, []);

  // SWR-powered sessions fetch
  const { data, isLoading, mutate } = useSWR<PagedSessions>(
    [
      "/owner/sessions",
      {
        page,
        pageSize,
        spaceId: filterSpace,
        status: filterStatus,
        search,
        from: fromDate ? new Date(fromDate).toISOString() : "",
        to: toDate ? new Date(toDate + "T23:59:59").toISOString() : "",
      },
    ],
    pageFetcher,
  );

  const sessions: ParkingSession[] = data?.data ?? [];
  const lastPage = data?.lastPage ?? 1;
  const total = data?.total ?? 0;

  const spaceName = spaces.find((s) => s.spaceId === spaceIdFromUrl)?.name;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground tracking-tight">
            Sessions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} total</p>
        </div>
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
              page: 1,
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
        onRemove={(key) => setParams({ [key]: "", page: 1 })}
      />

      {/* List */}
      {isLoading && !data ? (
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
          className={`transition-opacity duration-150 ${isLoading && !!data ? "opacity-50 pointer-events-none" : ""}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessions.map((s) => {
              const isActive =
                s.status === "ACTIVE" || s.status === "CHECKOUT_REQUESTED";
              const amount =
                s.status === "ACTIVE" && (s as any).estimatedAmountPaise != null
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
                      <span className="font-mono font-bold text-sm text-foreground truncate">
                        {s.vehicleNumber}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                      {TYPE_TO_SHORT[s.vehicleType] ?? s.vehicleType}
                    </span>
                  </div>

                  {/* Space + date */}
                  <p className="text-[11px] text-muted-foreground">
                    {s.space.name} · {formatDate(s.checkedInAt)}
                    {s.guestName && " · Guest"}
                    {s.isOnBehalf && " · On-behalf"}
                  </p>

                  {/* Duration + amount */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {duration}
                    </span>
                    <span className="text-[11px] font-semibold text-primary tabular-nums shrink-0">
                      {amount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
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
