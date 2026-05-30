"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { IconSearch, IconCar, IconX } from "@tabler/icons-react";
import { ContactChip } from "@/components/shared/contact-chip";
import {
  formatAmount,
  formatTime,
  formatDuration,
  TYPE_TO_DISPLAY,
} from "@/lib/vehicle-utils";
import type { ParkingSession } from "@/shared/types/entities";

export interface LotViewProps {
  sessions: ParkingSession[];
  loading: boolean;
  filterSlot?: React.ReactNode;
  vehicleTypeFilter?: string;
}

function SessionCard({
  session,
  now,
}: {
  session: ParkingSession;
  now: number;
}) {
  const duration = formatDuration(
    Math.max(
      0,
      Math.floor((now - new Date(session.checkedInAt).getTime()) / 60000),
    ),
  );
  const isCheckoutReq = session.status === "CHECKOUT_REQUESTED";
  const estPaise = (session as { estimatedAmountPaise?: number | null })
    .estimatedAmountPaise;

  const parker = session.guestName ?? session.userName;
  const parkerPhone = session.guestPhone ?? session.userPhone;
  const parkerLabel = session.guestName ? "Guest" : "Registered";
  const staffName = session.checkedInByName;
  const staffPhone = session.checkedInByPhone;
  const hasContact = !!(parker || staffName);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header: plate ← → type */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 bg-primary ${
              isCheckoutReq ? "opacity-60" : "animate-pulse"
            }`}
          />
          <span className="font-mono font-bold text-sm text-foreground truncate">
            {session.vehicleNumber}
          </span>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground shrink-0">
          {TYPE_TO_DISPLAY[session.vehicleType] ?? session.vehicleType}
          {isCheckoutReq && (
            <span className="ml-1.5 text-amber-500 font-semibold">
              · Checkout
            </span>
          )}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Body */}
      <div className="px-3 pt-2 pb-3 space-y-1.5">
        {/* Parker by Staff */}
        {hasContact && (
          <div className="flex items-center gap-1 flex-wrap">
            {parker && (
              <ContactChip
                name={parker}
                phone={parkerPhone}
                label={parkerLabel}
              />
            )}
            {staffName && (
              <>
                <span className="text-[10px] text-muted-foreground">by</span>
                <ContactChip
                  name={staffName}
                  phone={staffPhone}
                  label="Checked in by"
                />
              </>
            )}
          </div>
        )}

        {/* Time · duration | est. amount */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs min-w-0">
            <span className="text-muted-foreground">
              {formatTime(session.checkedInAt)}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="font-medium text-foreground">{duration}</span>
          </div>
          {estPaise != null && (
            <span className="text-xs font-semibold text-primary shrink-0 tabular-nums">
              {formatAmount(estPaise)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function LotView({
  sessions,
  loading,
  filterSlot,
  vehicleTypeFilter = "",
}: LotViewProps) {
  const [query, setQuery] = useState("");
  // Single ticker for all cards — one interval, one re-render per tick
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const filtered = (() => {
    let result = vehicleTypeFilter
      ? sessions.filter((s) => s.vehicleType === vehicleTypeFilter)
      : sessions;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (s) =>
          s.vehicleNumber.toLowerCase().includes(q) ||
          (s.guestName ?? "").toLowerCase().includes(q) ||
          (s.userName ?? "").toLowerCase().includes(q) ||
          (s.guestPhone ?? "").includes(q) ||
          (s.userPhone ?? "").includes(q) ||
          (s.checkedInByName ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  })();

  return (
    <div className="space-y-3">
      {/* Search + optional filter slot */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="relative flex-1">
          <IconSearch
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search plate, name, phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 pr-8 h-9 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <IconX size={13} />
            </button>
          )}
        </div>
        {filterSlot && <div className="shrink-0">{filterSlot}</div>}
      </div>

      {/* Grid */}
      {loading && sessions.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center space-y-2">
          <IconCar size={28} className="text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {query ? "No matches" : "No vehicles currently parked"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((s) => (
            <SessionCard key={s.parkingSessionId} session={s} now={now} />
          ))}
        </div>
      )}

      {query && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {filtered.length} of {sessions.length} vehicles
        </p>
      )}
    </div>
  );
}
