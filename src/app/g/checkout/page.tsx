"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { formatAmount } from "@/lib/vehicle-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconClock,
  IconCar,
  IconMapPin,
  IconCircleCheck,
  IconArrowLeft,
} from "@tabler/icons-react";

interface GuestSession {
  parkingSessionId: string;
  spaceName: string;
  vehicleNumber: string;
  vehicleType: string;
  checkedInAt: string;
}

const VEHICLE_LABELS: Record<string, string> = {
  TWO_WHEELER: "Two Wheeler",
  THREE_WHEELER: "Three Wheeler",
  FOUR_WHEELER: "Four Wheeler",
  HEAVY: "Heavy Vehicle",
};

function formatDuration(checkedInAt: string): string {
  const mins = Math.floor(
    (Date.now() - new Date(checkedInAt).getTime()) / 60000,
  );
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function GuestCheckoutPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  // Redirect logged-in users to /dashboard — mirrors /g/checkin pattern
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      router.replace("/dashboard");
    }
  }, []);
  const [sessions, setSessions] = useState<GuestSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [estimatedAmounts, setEstimatedAmounts] = useState<
    Record<string, number>
  >({});

  async function handleLookup() {
    if (phone.length < 10) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<GuestSession[]>(
        `/guest/sessions?phone=${phone}`,
        { auth: false },
      );
      if (!data || data.length === 0) {
        setError("No active sessions found for this number.");
        setSessions([]);
      } else {
        setSessions(data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckoutRequest(sessionId: string) {
    setRequestingId(sessionId);
    setCardErrors((prev) => ({ ...prev, [sessionId]: "" }));
    try {
      await apiFetch("/guest/checkout-requests", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
        auth: false,
      });
      setRequestedIds((prev) => new Set(prev).add(sessionId));
      setCardErrors((prev) => ({ ...prev, [sessionId]: "" }));
      // Fire-and-forget: fetch estimated amount for display
      apiFetch<{ estimatedAmountPaise: number }>(
        `/guest/sessions/${sessionId}/amount`,
        { auth: false },
      )
        .then((d) => {
          setEstimatedAmounts((prev) => ({
            ...prev,
            [sessionId]: d.estimatedAmountPaise,
          }));
        })
        .catch(() => {});
    } catch {
      setCardErrors((prev) => ({
        ...prev,
        [sessionId]: "Request failed. Try again.",
      }));
    } finally {
      setRequestingId(null);
    }
  }

  const showSessions = sessions.length > 0;

  // ── Screen 2: Sessions list ──────────────────────────────────────────────
  if (showSessions) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSessions([])}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconArrowLeft size={16} />
            Back
          </button>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm font-medium text-foreground">
            Active sessions for{" "}
            <span className="font-mono tracking-wide">{phone}</span>
          </span>
        </div>

        {/* Session cards */}
        <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-3 pt-5">
          {sessions.map((session) => {
            const done = requestedIds.has(session.parkingSessionId);
            const requesting = requestingId === session.parkingSessionId;

            return (
              <Card
                key={session.parkingSessionId}
                className="border border-border shadow-sm"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Space name */}
                  <div className="flex items-start gap-2">
                    <IconMapPin
                      size={15}
                      className="text-primary mt-0.5 shrink-0"
                    />
                    <span className="font-semibold text-foreground text-sm leading-tight">
                      {session.spaceName}
                    </span>
                  </div>

                  {/* Metadata row */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <IconCar size={13} />
                      <span className="font-mono font-medium text-foreground">
                        {session.vehicleNumber}
                      </span>
                      <span>·</span>
                      <span>
                        {VEHICLE_LABELS[session.vehicleType] ??
                          session.vehicleType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <IconClock size={12} />
                      <span>{formatDuration(session.checkedInAt)}</span>
                    </div>
                  </div>

                  {/* Action */}
                  {done ? (
                    <div className="space-y-1 pt-0.5">
                      {estimatedAmounts[session.parkingSessionId] != null && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Estimated amount
                          </span>
                          <span className="font-semibold text-primary tabular-nums">
                            {formatAmount(
                              estimatedAmounts[session.parkingSessionId],
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <IconCircleCheck
                          size={14}
                          className="text-primary shrink-0"
                        />
                        <span>Request sent. Staff will process shortly.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        size="sm"
                        disabled={requesting}
                        onClick={() =>
                          handleCheckoutRequest(session.parkingSessionId)
                        }
                      >
                        {requesting ? "Requesting…" : "Request Checkout"}
                      </Button>
                      {cardErrors[session.parkingSessionId] && (
                        <p className="text-xs text-destructive text-center">
                          {cardErrors[session.parkingSessionId]}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Screen 1: Phone lookup ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="space-y-1.5 text-center">
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
            Find your sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the phone number you used at check-in
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <Input
            type="tel"
            inputMode="numeric"
            placeholder="9876543210"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            className="text-center font-mono text-lg tracking-widest h-12"
          />

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          <Button
            className="w-full"
            disabled={phone.length < 10 || loading}
            onClick={handleLookup}
          >
            {loading ? "Searching…" : "Find my sessions"}
          </Button>
        </div>

        {/* Back link */}
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconArrowLeft size={12} />
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
