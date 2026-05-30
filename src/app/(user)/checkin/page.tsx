"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconCircleCheck,
  IconMapPin,
  IconCar,
  IconPlus,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RatesSheet } from "@/components/user/rates-sheet";
import { TYPE_TO_FULL } from "@/lib/vehicle-utils";

type VehicleType = "TWO_WHEELER" | "THREE_WHEELER" | "FOUR_WHEELER" | "HEAVY";

interface Vehicle {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  nickname?: string | null;
}

const VEHICLE_LABELS = TYPE_TO_FULL;

interface SessionResult {
  tokenId: string | null;
  parkingSessionId: string;
}

type PageState =
  | { tag: "loading" }
  | { tag: "error"; msg: string }
  | {
      tag: "form";
      actionSessionId: string;
      spaceId: string;
      spaceName: string;
      businessName?: string;
      isGuest: boolean;
      supportedVehicleTypes: string[];
      expiresAt: number;
    }
  | { tag: "receipt"; token: string; plate: string; spaceName: string };

export default function CheckinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>({ tag: "loading" });
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("FOUR_WHEELER");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [newType, setNewType] = useState<VehicleType>("FOUR_WHEELER");
  const [newPlate, setNewPlate] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const initialized = useRef(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (state.tag !== "form") return;
    const tick = () => {
      const r = Math.max(0, state.expiresAt - Date.now());
      setTimeLeft(r);
      if (r === 0) {
        localStorage.removeItem("pending_checkin");
        setState({
          tag: "error",
          msg: "Check-in session expired. Scan the QR code again.",
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.tag === "form" ? state.expiresAt : 0]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // Path 1: persisted action session from scan page (localStorage, survives refresh)
    const raw = localStorage.getItem("pending_checkin");
    if (raw) {
      try {
        const stored = JSON.parse(raw) as {
          actionSessionId: string;
          spaceId?: string;
          spaceName: string;
          businessName?: string;
          supportedVehicleTypes: string[];
          expiresAt: number;
        };
        if (stored.expiresAt > Date.now()) {
          setState({
            tag: "form",
            actionSessionId: stored.actionSessionId,
            spaceId: stored.spaceId ?? "",
            spaceName: stored.spaceName,
            businessName: stored.businessName,
            isGuest: false,
            supportedVehicleTypes: stored.supportedVehicleTypes ?? [],
            expiresAt: stored.expiresAt,
          });
          loadVehicles(stored.supportedVehicleTypes ?? []);
          return;
        }
      } catch {}
      // Expired or corrupt — clear it
      localStorage.removeItem("pending_checkin");
    }

    // Path 2: direct QR scan — token in URL
    const token = searchParams.get("token");
    if (!token) {
      setState({
        tag: "error",
        msg: "No active checkin session. Scan a valid QR code.",
      });
      return;
    }

    const isGuest = !localStorage.getItem("auth_token");

    apiFetch<{
      id: string;
      spaceId: string;
      spaceName: string;
      businessName?: string;
      supportedVehicleTypes?: string[];
    }>("/action-sessions", {
      method: "POST",
      body: JSON.stringify({ uuid: token }),
      auth: !isGuest,
    })
      .then((data) => {
        const supported = data.supportedVehicleTypes ?? [];
        localStorage.setItem(
          "pending_checkin",
          JSON.stringify({
            actionSessionId: data.id,
            spaceId: data.spaceId,
            spaceName: data.spaceName,
            businessName: data.businessName,
            supportedVehicleTypes: supported,
            expiresAt: Date.now() + 5 * 60 * 1000,
          }),
        );
        setState({
          tag: "form",
          actionSessionId: data.id,
          spaceId: data.spaceId,
          spaceName: data.spaceName,
          businessName: data.businessName,
          isGuest,
          supportedVehicleTypes: supported,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
        if (!isGuest) loadVehicles(supported);
      })
      .catch(() => {
        setState({ tag: "error", msg: "Invalid or expired check-in link." });
      });
  }, [searchParams]);

  const countdownDisplay = (() => {
    const mins = Math.floor(timeLeft / 60000);
    const secs = Math.floor((timeLeft % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  })();

  async function loadVehicles(supportedTypes: string[]) {
    setVehiclesLoading(true);
    try {
      const data = await apiFetch<Vehicle[]>("/vehicles");
      const filtered =
        supportedTypes.length > 0
          ? data.filter((v) => supportedTypes.includes(v.vehicleType))
          : data;
      setVehicles(filtered);
      if (filtered.length > 0) setSelectedVehicleId(filtered[0].vehicleId);
    } catch {
      // silent — user can still fall back to manual
    } finally {
      setVehiclesLoading(false);
    }
  }

  async function handleAddVehicle() {
    if (!newPlate.trim()) return;
    setAddingSaving(true);
    setAddError(null);
    try {
      const added = await apiFetch<Vehicle>("/vehicles", {
        method: "POST",
        body: JSON.stringify({
          vehicleType: newType,
          vehicleNumber: newPlate.toUpperCase(),
          nickname: newNickname.trim() || undefined,
        }),
      });
      const supported = state.tag === "form" ? state.supportedVehicleTypes : [];
      if (supported.length === 0 || supported.includes(added.vehicleType)) {
        setVehicles((prev) => [...prev, added]);
        setSelectedVehicleId(added.vehicleId);
      }
      setAddOpen(false);
      setNewPlate("");
      setNewNickname("");
      setNewType("FOUR_WHEELER");
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to add vehicle.",
      );
    } finally {
      setAddingSaving(false);
    }
  }

  async function handleCheckin() {
    if (state.tag !== "form") return;
    // Auth path: submit with vehicleId
    if (!state.isGuest) {
      if (!selectedVehicleId) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        await apiFetch("/sessions", {
          method: "POST",
          body: JSON.stringify({
            actionSessionId: state.actionSessionId,
            vehicleId: selectedVehicleId,
          }),
          auth: true,
        });
        localStorage.removeItem("pending_checkin");
        router.replace("/dashboard");
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Check-in failed.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    // Guest path
    if (!plate.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch<SessionResult>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          actionSessionId: state.actionSessionId,
          guestVehicleNumber: plate.toUpperCase(),
          guestVehicleType: vehicleType,
          guestName: guestName.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
        }),
        auth: !state.isGuest,
      });

      if (state.isGuest) {
        localStorage.removeItem("pending_checkin");
        setState({
          tag: "receipt",
          token: res.tokenId ?? res.parkingSessionId.slice(0, 8).toUpperCase(),
          plate: plate.toUpperCase(),
          spaceName: state.spaceName,
        });
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state.tag === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (state.tag === "error") {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-sm text-destructive font-medium">{state.msg}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.replace("/scan")}
        >
          Scan QR
        </Button>
      </div>
    );
  }

  if (state.tag === "receipt") {
    return (
      <div className="space-y-5 text-center py-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <IconCircleCheck size={36} className="text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">
            Checked in!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {state.spaceName}
          </p>
        </div>
        <div className="bg-muted rounded-2xl p-6 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Your token
          </p>
          <p className="font-mono font-black text-4xl text-primary tracking-widest">
            {state.token}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Show this to staff when checking out
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {state.plate} · {VEHICLE_LABELS[vehicleType]}
        </p>
      </div>
    );
  }

  // Filter vehicle types to only those supported by the space
  const availableTypes = (
    Object.entries(VEHICLE_LABELS) as [VehicleType, string][]
  ).filter(
    ([val]) =>
      state.supportedVehicleTypes.length === 0 ||
      state.supportedVehicleTypes.includes(val),
  );

  if (
    state.tag === "form" &&
    state.supportedVehicleTypes.length > 0 &&
    availableTypes.length === 0
  ) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm font-medium text-foreground">
          Space doesn&apos;t support your vehicle types
        </p>
        <p className="text-xs text-muted-foreground">
          This parking space has no pricing for the available vehicle types.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.replace("/dashboard")}
        >
          Go back
        </Button>
      </div>
    );
  }

  // Form
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1 flex items-center gap-1">
          <IconMapPin size={11} /> Checking in at
        </p>
        <h1 className="font-heading font-bold text-xl text-foreground">
          {state.spaceName}
        </h1>
        {state.businessName && (
          <p className="text-sm text-muted-foreground">{state.businessName}</p>
        )}
        {state.tag === "form" && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full mt-2 ${
              timeLeft < 60000
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            ⏱ {countdownDisplay} remaining
          </div>
        )}
      </div>

      {!state.isGuest ? (
        /* Authenticated: pick a registered vehicle */
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Select your vehicle
          </p>
          {vehiclesLoading ? (
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
          ) : vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No registered vehicles match this space. Add one from below.
            </p>
          ) : (
            <div className="space-y-2">
              {vehicles.map((v) => (
                <button
                  key={v.vehicleId}
                  onClick={() => setSelectedVehicleId(v.vehicleId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    selectedVehicleId === v.vehicleId
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <IconCar
                    size={18}
                    className={
                      selectedVehicleId === v.vehicleId
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-sm text-foreground">
                      {v.vehicleNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {VEHICLE_LABELS[v.vehicleType]}
                      {v.nickname ? ` · ${v.nickname}` : ""}
                    </p>
                  </div>
                  {selectedVehicleId === v.vehicleId && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 mt-1"
            onClick={() => {
              setAddOpen(true);
              setAddError(null);
              if (
                state.tag === "form" &&
                state.supportedVehicleTypes.length > 0
              ) {
                setNewType(state.supportedVehicleTypes[0] as VehicleType);
              }
            }}
          >
            <IconPlus size={14} /> Add vehicle
          </Button>
        </div>
      ) : (
        /* Guest: manual form */
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Vehicle type
            </label>
            <Select
              value={vehicleType}
              onValueChange={(v) => setVehicleType(v as VehicleType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Number plate
            </label>
            <Input
              placeholder="TS09FB9765"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              placeholder="Your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Phone
            </label>
            <Input
              placeholder="9876543210"
              value={guestPhone}
              onChange={(e) =>
                setGuestPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              inputMode="numeric"
              type="tel"
            />
          </div>
        </div>
      )}

      {submitError && <p className="text-xs text-destructive">{submitError}</p>}

      {state.tag === "form" && state.spaceId && (
        <button
          type="button"
          onClick={() => setRatesOpen(true)}
          className="w-full text-xs text-primary underline underline-offset-2 text-center hover:no-underline"
        >
          View rates
        </button>
      )}

      <Button
        className="w-full"
        disabled={
          state.isGuest
            ? !plate.trim() ||
              !guestName.trim() ||
              guestPhone.length < 10 ||
              submitting
            : !selectedVehicleId || submitting
        }
        onClick={handleCheckin}
      >
        {submitting ? "Checking in…" : "Check In"}
      </Button>

      {state.isGuest && (
        <p className="text-center text-xs text-muted-foreground">
          Have an account?{" "}
          <button
            className="text-primary underline underline-offset-2"
            onClick={() =>
              router.push(
                `/signin?next=${encodeURIComponent(`/checkin?token=${searchParams.get("token") ?? ""}`)}`,
              )
            }
          >
            Sign in
          </button>
        </p>
      )}

      {state.tag === "form" && state.spaceId && (
        <RatesSheet
          open={ratesOpen}
          onOpenChange={setRatesOpen}
          spaceId={state.spaceId}
          spaceName={state.spaceName}
          supportedVehicleTypes={state.supportedVehicleTypes}
        />
      )}

      {/* Add vehicle dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Vehicle type
              </label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as VehicleType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Number plate
              </label>
              <Input
                placeholder="TS09FB9765"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Nickname{" "}
                <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <Input
                placeholder="My car"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
              />
            </div>
            {addError && <p className="text-xs text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newPlate.trim() || addingSaving}
              onClick={handleAddVehicle}
            >
              {addingSaving ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
