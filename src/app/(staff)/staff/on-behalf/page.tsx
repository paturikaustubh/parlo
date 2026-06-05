"use client";

import { useState, useEffect } from "react";
import { clockTime } from "@/lib/time";
import { useTimeFormat } from "@/hooks/use-time-format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { useStaff } from "@/contexts/staff-context";
import { useStaffExpiry } from "@/contexts/staff-expiry-context";
import { cn } from "@/lib/utils";
import {
  IconCar,
  IconClock,
  IconSearch,
  IconCheck,
  IconHelpCircle,
} from "@tabler/icons-react";

import { TYPE_TO_SHORT, formatAmount } from "@/lib/vehicle-utils";
import { PriceBreakdownDialog } from "@/components/user/price-breakdown-dialog";
import type { VehicleType as VehicleTypeEnum } from "@/shared/types/enums";

type Tab = "checkin" | "checkout";
type VehicleType = "TWO_WHEELER" | "THREE_WHEELER" | "FOUR_WHEELER" | "HEAVY";

interface SpaceSession {
  parkingSessionId: string;
  vehicleNumber: string;
  vehicleType: string;
  durationMinutes: number | null;
  checkedInAt: string;
  estimatedAmountPaise: number | null;
  guestName: string | null;
  guestPhone: string | null;
  status: string;
}

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "TWO_WHEELER", label: TYPE_TO_SHORT.TWO_WHEELER },
  { value: "THREE_WHEELER", label: TYPE_TO_SHORT.THREE_WHEELER },
  { value: "FOUR_WHEELER", label: TYPE_TO_SHORT.FOUR_WHEELER },
  { value: "HEAVY", label: TYPE_TO_SHORT.HEAVY },
];

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function OnBehalfPage() {
  const { use12 } = useTimeFormat();
  const { staffMember } = useStaff();
  const { isExpired } = useStaffExpiry();
  const [tab, setTab] = useState<Tab>("checkin");
  const [supportedTypes, setSupportedTypes] = useState<VehicleType[]>([]);

  useEffect(() => {
    if (!staffMember?.spaceId) return;
    apiFetch<{ supportedVehicleTypes: string[] }>(
      `/spaces/${staffMember.spaceId}/qr`,
    )
      .then((d) => {
        const types = d.supportedVehicleTypes as VehicleType[];
        if (types.length > 0) {
          setSupportedTypes(types);
          setVehicleType(types[0]);
        }
      })
      .catch(() => {});
  }, [staffMember?.spaceId]);

  const availableTypes =
    supportedTypes.length > 0
      ? VEHICLE_TYPES.filter((t) => supportedTypes.includes(t.value))
      : VEHICLE_TYPES;

  // Check-in state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("TWO_WHEELER");
  const [checkingIn, setCheckingIn] = useState(false);

  // Check-out state
  const [sessions, setSessions] = useState<SpaceSession[]>([]);
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<SpaceSession | null>(
    null,
  );
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [lockedAmount, setLockedAmount] = useState<number | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Live clock for duration display
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

  useEffect(() => {
    if (tab === "checkout") {
      apiFetch<SpaceSession[]>("/staff/me/space-sessions?status=ACTIVE")
        .then(setSessions)
        .catch(() => setSessions([]));
    }
  }, [tab]);

  async function handleCheckIn() {
    if (!vehicleNumber.trim()) return;
    setCheckingIn(true);
    try {
      const fullPhone = phone
        ? phone.startsWith("+91")
          ? phone
          : `+91${phone}`
        : undefined;
      await apiFetch("/staff/me/checkin", {
        method: "POST",
        body: JSON.stringify({
          vehicleNumber: vehicleNumber.toUpperCase().trim(),
          vehicleType,
          name: name.trim() || undefined,
          phone: fullPhone,
        }),
      });
      showToast("Vehicle checked in.", "success");
      setVehicleNumber("");
      setName("");
      setPhone("");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Check-in failed.",
        "error",
      );
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    if (!selectedSession) return;
    setCheckingOut(true);
    try {
      await apiFetch(`/sessions/${selectedSession.parkingSessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      showToast("Vehicle checked out.", "success");
      setSelectedSession(null);
      setSessions((prev) =>
        prev.filter(
          (s) => s.parkingSessionId !== selectedSession.parkingSessionId,
        ),
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Check-out failed.",
        "error",
      );
    } finally {
      setCheckingOut(false);
    }
  }

  const filteredSessions = sessions.filter((s) =>
    s.vehicleNumber.toLowerCase().includes(sessionSearch.toLowerCase()),
  );

  return (
    <>
      <div className="space-y-6 max-w-lg">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
          On-behalf
        </h1>

        {/* Tab switcher */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {(["checkin", "checkout"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "checkin" ? "Check In" : "Check Out"}
            </button>
          ))}
        </div>

        {/* ── CHECK IN ─────────────────────────────────────────────────────────── */}
        {tab === "checkin" && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Vehicle section */}
            <div className="px-5 pt-5 pb-4 space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Vehicle
              </p>

              {/* Number plate — hero field */}
              <Input
                disabled={isExpired}
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="MH 12 AB 1234"
                className="font-mono uppercase h-12 text-base tracking-wider"
              />

              {/* Type pills */}
              <div className="flex gap-2">
                {availableTypes.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    disabled={isExpired}
                    onClick={() => setVehicleType(value)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-semibold border transition-all",
                      vehicleType === value
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      isExpired && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/60" />

            {/* Parker section */}
            <div className="px-5 pt-4 pb-5 space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Parker{" "}
                <span className="normal-case font-normal tracking-normal">
                  (optional)
                </span>
              </p>

              {/* Name + phone: 2-col on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  disabled={isExpired}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                />
                <div className="flex">
                  <span className="flex items-center px-3 rounded-l-xl text-sm font-medium border border-r-0 border-border bg-muted text-muted-foreground shrink-0">
                    +91
                  </span>
                  <Input
                    disabled={isExpired}
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="Phone number"
                    inputMode="numeric"
                    type="tel"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="px-5 pb-5">
              <Button
                className="w-full h-11"
                disabled={!vehicleNumber.trim() || checkingIn || isExpired}
                onClick={handleCheckIn}
              >
                {isExpired
                  ? "Locked — subscription expired"
                  : checkingIn
                    ? "Checking in…"
                    : "Check In Vehicle"}
              </Button>
            </div>
          </div>
        )}

        {/* ── CHECK OUT ────────────────────────────────────────────────────────── */}
        {tab === "checkout" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <IconSearch
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                disabled={isExpired}
                placeholder="Search by plate…"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Session list */}
            <div className="space-y-2">
              {filteredSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-10 text-center space-y-1.5">
                  <IconCar
                    size={22}
                    className="text-muted-foreground/50 mx-auto"
                  />
                  <p className="text-sm text-muted-foreground">
                    No active sessions
                  </p>
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const selected =
                    selectedSession?.parkingSessionId === s.parkingSessionId;
                  return (
                    <button
                      key={s.parkingSessionId}
                      type="button"
                      onClick={() =>
                        setSelectedSession((prev) =>
                          prev?.parkingSessionId === s.parkingSessionId
                            ? null
                            : s,
                        )
                      }
                      className={cn(
                        "w-full text-left rounded-xl border px-4 py-3 transition-all",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-muted-foreground/40",
                      )}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-base text-foreground tracking-wider">
                          {s.vehicleNumber}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {TYPE_TO_SHORT[s.vehicleType as VehicleType] ??
                            s.vehicleType.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Duration + amount */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1">
                          <IconClock
                            size={11}
                            className="text-muted-foreground shrink-0"
                          />
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {liveDuration(s.checkedInAt)}
                          </span>
                        </div>
                        {s.estimatedAmountPaise != null && (
                          <span className="text-sm font-bold text-primary tabular-nums">
                            {formatAmount(s.estimatedAmountPaise)} est.
                          </span>
                        )}
                      </div>

                      {/* Check-in time */}
                      <p className="text-[11px] text-muted-foreground">
                        Checked in {clockTime(s.checkedInAt, use12)}
                        {(s.guestName || s.guestPhone) && (
                          <span>
                            {" · "}
                            {s.guestName ?? s.guestPhone}
                          </span>
                        )}
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            {selectedSession && (
              <Button
                className="w-full h-12 text-base"
                disabled={isExpired}
                onClick={() => {
                  setLockedAt(new Date().toISOString());
                  setLockedAmount(selectedSession.estimatedAmountPaise ?? null);
                  setConfirmOpen(true);
                }}
              >
                {isExpired
                  ? "Locked — subscription expired"
                  : selectedSession.estimatedAmountPaise != null
                    ? `Check Out · Collect ${formatAmount(selectedSession.estimatedAmountPaise)}`
                    : `Check Out · ${selectedSession.vehicleNumber}`}
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Checkout confirm dialog */}
      {selectedSession && lockedAt && (
        <Dialog
          open={confirmOpen}
          onOpenChange={(o) => {
            if (!o) setConfirmOpen(false);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-mono tracking-widest text-lg">
                Checkout {selectedSession.vehicleNumber}?
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Amount */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Amount to collect
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xl text-primary tabular-nums">
                    {lockedAmount != null ? formatAmount(lockedAmount) : "—"}
                  </span>
                  {selectedSession && (
                    <button
                      type="button"
                      onClick={() => setShowBreakdown(true)}
                      className="text-muted-foreground/50 hover:text-primary transition-colors"
                      aria-label="View price breakdown"
                    >
                      <IconHelpCircle size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-sm text-foreground tracking-wider">
                    {selectedSession.vehicleNumber}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                    {TYPE_TO_SHORT[
                      selectedSession.vehicleType as VehicleType
                    ] ?? selectedSession.vehicleType.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {(() => {
                    const start = new Date(selectedSession.checkedInAt);
                    const end = new Date(lockedAt);
                    const secs = Math.max(
                      0,
                      Math.floor((end.getTime() - start.getTime()) / 1000),
                    );
                    const h = Math.floor(secs / 3600);
                    const m = Math.floor((secs % 3600) / 60);
                    const fmt = (d: Date) => clockTime(d.toISOString(), use12);
                    const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
                    return `${fmt(start)} → ${fmt(end)}  ·  ${dur}`;
                  })()}
                </p>
                {(selectedSession.guestName || selectedSession.guestPhone) && (
                  <p className="text-xs text-muted-foreground">
                    {selectedSession.guestName ?? selectedSession.guestPhone}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={checkingOut}
                onClick={async () => {
                  setConfirmOpen(false);
                  await handleCheckOut();
                }}
              >
                <IconCheck size={14} />
                {checkingOut ? "Checking out…" : "Confirm checkout"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {selectedSession && lockedAt && showBreakdown && (
        <PriceBreakdownDialog
          open={showBreakdown}
          onOpenChange={setShowBreakdown}
          sessionId={selectedSession.parkingSessionId}
          spaceName=""
          vehicleType={selectedSession.vehicleType as VehicleTypeEnum}
          vehicleNumber={selectedSession.vehicleNumber}
          durationMinutes={Math.floor(
            (new Date(lockedAt).getTime() -
              new Date(selectedSession.checkedInAt).getTime()) /
              60000,
          )}
          amountPaise={lockedAmount}
          checkedInAt={selectedSession.checkedInAt}
        />
      )}
    </>
  );
}
