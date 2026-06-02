"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { ScannerShell } from "@/components/shared/scanner-shell";
import { IconCircleCheck, IconMapPin } from "@tabler/icons-react";

type VehicleType = "TWO_WHEELER" | "THREE_WHEELER" | "FOUR_WHEELER" | "HEAVY";

const VEHICLE_LABELS: Record<VehicleType, string> = {
  TWO_WHEELER: "Two Wheeler",
  THREE_WHEELER: "Three Wheeler",
  FOUR_WHEELER: "Four Wheeler",
  HEAVY: "Heavy Vehicle",
};

interface SessionResult {
  tokenId: string | null;
  parkingSessionId: string;
}

type PageState =
  | { tag: "scanner" }
  | {
      tag: "form";
      actionSessionId: string;
      spaceName: string;
      businessName?: string;
      supportedVehicleTypes: string[];
      expiresAt: number;
    }
  | { tag: "receipt"; plate: string; vehicleType: string; spaceName: string };

function GuestCheckinInner() {
  const [state, setState] = useState<PageState>({ tag: "scanner" });
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("FOUR_WHEELER");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");

  const [timeLeft, setTimeLeft] = useState<number>(0);
  useEffect(() => {
    if (state.tag !== "form") return;
    const tick = () => {
      const r = Math.max(0, state.expiresAt - Date.now());
      setTimeLeft(r);
      if (r === 0) {
        localStorage.removeItem("pending_checkin");
        setState({ tag: "scanner" });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.tag === "form" ? state.expiresAt : 0]);

  const countdownDisplay = (() => {
    const mins = Math.floor(timeLeft / 60000);
    const secs = Math.floor((timeLeft % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  })();

  // On load: if URL has ?token=, check auth then redirect or exchange token
  useEffect(() => {
    if (!urlToken) return;
    (async () => {
      // Check if user is already logged in via stored token (avoids apiFetch 401→/signin redirect)
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        router.replace(`/checkin?token=${urlToken}`);
        return;
      }
      try {
        const data = await apiFetch<{
          id: string;
          spaceName: string;
          businessName?: string;
          supportedVehicleTypes?: string[];
        }>("/action-sessions", {
          method: "POST",
          body: JSON.stringify({ uuid: urlToken }),
          auth: false,
        });
        localStorage.setItem(
          "pending_checkin",
          JSON.stringify({
            actionSessionId: data.id,
            spaceName: data.spaceName,
            businessName: data.businessName,
            supportedVehicleTypes: data.supportedVehicleTypes ?? [],
            expiresAt: Date.now() + 5 * 60 * 1000,
          }),
        );
        setState({
          tag: "form",
          actionSessionId: data.id,
          spaceName: data.spaceName,
          businessName: data.businessName,
          supportedVehicleTypes: data.supportedVehicleTypes ?? [],
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
        if ((data.supportedVehicleTypes?.length ?? 0) > 0) {
          setVehicleType(data.supportedVehicleTypes![0] as VehicleType);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        setScanError(
          msg.toLowerCase().includes("expired")
            ? "QR code expired. Ask staff to refresh."
            : "Invalid QR code. Try again.",
        );
      }
    })();
  }, []); // run once on mount

  useEffect(() => {
    const raw = localStorage.getItem("pending_checkin");
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as {
        actionSessionId: string;
        spaceName: string;
        businessName?: string;
        supportedVehicleTypes: string[];
        expiresAt: number;
      };
      if (stored.expiresAt > Date.now()) {
        setState({
          tag: "form",
          actionSessionId: stored.actionSessionId,
          spaceName: stored.spaceName,
          businessName: stored.businessName,
          supportedVehicleTypes: stored.supportedVehicleTypes ?? [],
          expiresAt: stored.expiresAt,
        });
        return;
      }
    } catch {}
    localStorage.removeItem("pending_checkin");
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
    setScanError(null);
    let token: string | null = null;

    // Try as a full URL (e.g. "https://parlo.in/checkin?token=xxx")
    try {
      const url = new URL(decodedText);
      if (url.pathname === "/checkin" || url.pathname === "/g/checkin") {
        token = url.searchParams.get("token");
      }
    } catch {
      // QR encodes a bare path (e.g. "/checkin?token=xxx") — parse manually
      const match = decodedText.match(/^\/(?:g\/)?checkin\?(.+)$/);
      if (match) {
        token = new URLSearchParams(match[1]).get("token");
      }
    }

    if (!token) return; // Not a parking QR — ignore silently

    try {
      const data = await apiFetch<{
        id: string;
        spaceName: string;
        businessName?: string;
        supportedVehicleTypes?: string[];
      }>("/action-sessions", {
        method: "POST",
        body: JSON.stringify({ uuid: token }),
        auth: false,
      });
      localStorage.setItem(
        "pending_checkin",
        JSON.stringify({
          actionSessionId: data.id,
          spaceName: data.spaceName,
          businessName: data.businessName,
          supportedVehicleTypes: data.supportedVehicleTypes ?? [],
          expiresAt: Date.now() + 5 * 60 * 1000,
        }),
      );
      setState({
        tag: "form",
        actionSessionId: data.id,
        spaceName: data.spaceName,
        businessName: data.businessName,
        supportedVehicleTypes: data.supportedVehicleTypes ?? [],
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      if ((data.supportedVehicleTypes?.length ?? 0) > 0) {
        setVehicleType(data.supportedVehicleTypes![0] as VehicleType);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setScanError(
        msg.toLowerCase().includes("expired")
          ? "QR code expired. Ask staff to refresh."
          : "Invalid QR code. Try again.",
      );
      throw err; // Re-throw so QrScanner resets pausedRef and resumes scanning
    }
  }, []);

  async function handleCheckin() {
    if (state.tag !== "form" || !plate.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch<SessionResult>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          actionSessionId: state.actionSessionId,
          guestVehicleNumber: plate.toUpperCase(),
          guestVehicleType: vehicleType,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
        }),
        auth: false,
      });
      localStorage.removeItem("pending_checkin");
      setState({
        tag: "receipt",
        plate: plate.toUpperCase(),
        vehicleType: vehicleType,
        spaceName: state.spaceName,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  // While URL token is being processed, show nothing (prevents scanner flash)
  if (state.tag === "scanner" && urlToken) return null;

  if (state.tag === "scanner") {
    return (
      <ScannerShell
        onScan={handleScan}
        onBack={() => window.history.back()}
        hint="Point at the QR code at your parking space"
        bottomContent={
          <div className="px-6 py-5 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Scan parking QR code
            </p>
            <p className="text-xs text-muted-foreground">
              Point camera at the QR code at your parking space
            </p>
            {scanError && (
              <p className="text-xs text-destructive pt-1">{scanError}</p>
            )}
            <p className="text-xs text-muted-foreground pt-2">
              Want to leave?{" "}
              <a
                href="/g/checkout"
                className="text-primary underline underline-offset-2"
              >
                Request checkout
              </a>
            </p>
          </div>
        }
      />
    );
  }

  if (state.tag === "receipt") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-0">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
          {/* Animated checkmark ring */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-28 h-28 rounded-full bg-primary/10 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
              <IconCircleCheck
                size={52}
                className="text-primary"
                strokeWidth={1.5}
              />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="font-heading font-bold text-3xl text-foreground tracking-tight">
              You&rsquo;re checked in!
            </h1>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <IconMapPin size={13} className="text-muted-foreground/70" />
              {state.spaceName}
            </p>
          </div>

          {/* Vehicle summary pill */}
          <div className="w-full bg-muted/60 border border-border rounded-2xl px-6 py-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Plate
              </span>
              <span className="font-mono font-bold text-base text-foreground tracking-widest">
                {state.plate}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vehicle
              </span>
              <span className="text-sm font-medium text-foreground">
                {VEHICLE_LABELS[state.vehicleType as VehicleType] ??
                  state.vehicleType}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1 flex items-center gap-1">
            <IconMapPin size={11} /> Checking in at
          </p>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-heading font-bold text-xl text-foreground">
              {state.spaceName}
            </h1>
            <Link
              href="/g/checkout"
              className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Checkout
            </Link>
          </div>
          {state.businessName && (
            <p className="text-sm text-muted-foreground">
              {state.businessName}
            </p>
          )}
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full mt-2 ${
              timeLeft < 60000
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            ⏱ {countdownDisplay} remaining
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="vehicle-type"
              className="text-xs font-medium text-muted-foreground"
            >
              Vehicle type
            </label>
            <Select
              value={vehicleType}
              onValueChange={(v) => setVehicleType(v as VehicleType)}
            >
              <SelectTrigger id="vehicle-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(VEHICLE_LABELS) as [VehicleType, string][])
                  .filter(
                    ([val]) =>
                      state.tag === "form" &&
                      (state.supportedVehicleTypes.length === 0 ||
                        state.supportedVehicleTypes.includes(val)),
                  )
                  .map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="plate"
              className="text-xs font-medium text-muted-foreground"
            >
              Number plate
            </label>
            <Input
              id="plate"
              placeholder="TS09FB9765"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="font-mono uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="guest-name"
              className="text-xs font-medium text-muted-foreground"
            >
              Name
            </label>
            <Input
              id="guest-name"
              placeholder="Your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="guest-phone"
              className="text-xs font-medium text-muted-foreground"
            >
              Phone
            </label>
            <Input
              id="guest-phone"
              type="tel"
              placeholder="9876543210"
              value={guestPhone}
              onChange={(e) =>
                setGuestPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              inputMode="numeric"
            />
          </div>
        </div>

        {submitError && (
          <p className="text-xs text-destructive">{submitError}</p>
        )}

        <Button
          className="w-full"
          disabled={
            !plate.trim() ||
            !guestName.trim() ||
            !guestPhone.trim() ||
            guestPhone.length < 10 ||
            submitting
          }
          onClick={handleCheckin}
        >
          {submitting ? "Checking in…" : "Check In as Guest"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Have an account?{" "}
          <Link
            href={
              urlToken
                ? `/signin?next=${encodeURIComponent(`/g/checkin?token=${urlToken}`)}`
                : "/signin"
            }
            className="text-primary underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function GuestCheckinPage() {
  return (
    <Suspense>
      <GuestCheckinInner />
    </Suspense>
  );
}
