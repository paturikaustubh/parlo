"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { useStaff } from "@/contexts/staff-context";
import { useStaffExpiry } from "@/contexts/staff-expiry-context";
import { cn } from "@/lib/utils";
import { IconCar, IconClock, IconSearch } from "@tabler/icons-react";

import { TYPE_TO_SHORT } from "@/lib/vehicle-utils";

type Tab = "checkin" | "checkout";
type VehicleType = "TWO_WHEELER" | "THREE_WHEELER" | "FOUR_WHEELER" | "HEAVY";

interface SpaceSession {
  sessionId: string;
  vehicleNumber: string;
  vehicleType: string;
  durationMinutes: number;
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
      await apiFetch(`/sessions/${selectedSession.sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      showToast("Vehicle checked out.", "success");
      setSelectedSession(null);
      setSessions((prev) =>
        prev.filter((s) => s.sessionId !== selectedSession.sessionId),
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
                const selected = selectedSession?.sessionId === s.sessionId;
                return (
                  <button
                    key={s.sessionId}
                    type="button"
                    onClick={() =>
                      setSelectedSession((prev) =>
                        prev?.sessionId === s.sessionId ? null : s,
                      )
                    }
                    className={cn(
                      "w-full text-left rounded-xl border px-4 py-3 transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-muted-foreground/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-foreground tracking-wider">
                        {s.vehicleNumber}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        {s.vehicleType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <IconClock size={11} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(s.durationMinutes)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedSession && (
            <Button
              className="w-full h-11"
              disabled={checkingOut || isExpired}
              onClick={handleCheckOut}
            >
              {isExpired
                ? "Locked — subscription expired"
                : checkingOut
                  ? "Checking out…"
                  : `Check Out · ${selectedSession.vehicleNumber}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
