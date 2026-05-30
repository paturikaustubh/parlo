"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  IconCircleCheck,
  IconCircleX,
  IconHourglass,
  IconHelpCircle,
  IconCar,
  IconMotorbike,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import {
  formatAmount,
  formatDuration,
  TYPE_TO_DISPLAY,
  VEHICLE_ICONS,
} from "@/lib/vehicle-utils";
import { PriceBreakdownDialog } from "@/components/user/price-breakdown-dialog";
import type { CheckoutRequest } from "@/shared/types/entities";
import type { VehicleType } from "@/shared/types/enums";

interface Props {
  requestId: string;
}

const FADE: Parameters<typeof motion.div>[0] = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: "easeOut" },
};

function elapsedMinutes(checkedInAt: string): number {
  return Math.floor((Date.now() - new Date(checkedInAt).getTime()) / 60000);
}

export function CheckoutStateMachine({ requestId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CheckoutRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [breakdownSession, setBreakdownSession] =
    useState<
      typeof data extends null
        ? never
        : CheckoutRequest["sessions"][number] | null
    >(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const req = await apiFetch<CheckoutRequest>(
          `/checkout/requests/${requestId}`,
          { auth: false },
        );
        setData(req);
        setLoading(false);
        if (req.status !== "PENDING") clearInterval(intervalRef.current!);
      } catch {
        setLoading(false);
      }
    }
    poll();
    intervalRef.current = setInterval(poll, 4000);
    return () => clearInterval(intervalRef.current!);
  }, [requestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-sm text-muted-foreground">
          Checkout request not found.
        </p>
        <Button variant="outline" onClick={() => router.replace("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const multiSession = data.sessions.length > 1;

  return (
    <>
      <AnimatePresence mode="wait">
        {/* ── PENDING ─────────────────────────────────────────────────── */}
        {data.status === "PENDING" && (
          <motion.div key="pending" {...FADE} className="space-y-3">
            {/* Code card */}
            <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
              {/* Amber top accent */}
              <div className="h-0.5 bg-primary w-full" />

              <div className="px-6 pt-6 pb-5 text-center space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Show to exit staff
                </p>
                <p className="font-mono font-black text-[80px] leading-none text-foreground tracking-[0.12em] select-all">
                  {data.requestCode}
                </p>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] text-muted-foreground">
                    Waiting for staff approval…
                  </span>
                </div>
              </div>

              {/* Perforated divider */}
              <div className="flex items-center gap-0 px-0 mx-0">
                <div className="w-4 h-4 rounded-full bg-background border border-border -ml-2 shrink-0" />
                <div className="flex-1 border-t border-dashed border-border/60" />
                <div className="w-4 h-4 rounded-full bg-background border border-border -mr-2 shrink-0" />
              </div>

              {/* Sessions */}
              <div className="px-5 py-4 space-y-3">
                {data.sessions.map((s) => {
                  const Icon = VEHICLE_ICONS[s.vehicleType as VehicleType];
                  const dur = elapsedMinutes(s.checkedInAt);
                  return (
                    <div
                      key={s.parkingSessionId}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Icon size={14} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-sm text-foreground">
                            {s.vehicleNumber}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {TYPE_TO_DISPLAY[s.vehicleType as VehicleType]} ·{" "}
                            {formatDuration(dur)}
                          </p>
                        </div>
                      </div>
                      {multiSession && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-heading font-bold text-sm text-primary">
                            {s.amountPaise != null
                              ? formatAmount(s.amountPaise)
                              : "—"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setBreakdownSession(s)}
                            className="text-muted-foreground/50 hover:text-primary transition-colors"
                            aria-label="View price breakdown"
                          >
                            <IconHelpCircle size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total row */}
              <div className="px-5 pb-5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {multiSession ? "Total due" : "Amount due"}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="font-heading font-bold text-2xl text-foreground">
                    {formatAmount(data.combinedAmountPaise)}
                  </p>
                  {data.sessions[0] && (
                    <button
                      type="button"
                      onClick={() => setBreakdownSession(data.sessions[0])}
                      className="text-muted-foreground/50 hover:text-primary transition-colors mt-0.5"
                      aria-label="View price breakdown"
                    >
                      <IconHelpCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center px-4 leading-relaxed">
              Keep this screen open. Staff will approve once payment is
              confirmed.
            </p>
          </motion.div>
        )}

        {/* ── APPROVED ────────────────────────────────────────────────── */}
        {data.status === "APPROVED" && (
          <motion.div key="approved" {...FADE} className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
              <div className="h-0.5 bg-emerald-500 w-full" />
              <div className="px-6 py-8 text-center space-y-2">
                <IconCircleCheck
                  size={44}
                  className="text-emerald-500 mx-auto"
                />
                <h2 className="font-heading font-bold text-2xl text-foreground">
                  Cleared to leave
                </h2>
                <p className="text-sm text-muted-foreground">
                  Payment confirmed. Drive safe!
                </p>
              </div>

              <div className="flex items-center gap-0">
                <div className="w-4 h-4 rounded-full bg-background border border-border -ml-2 shrink-0" />
                <div className="flex-1 border-t border-dashed border-border/60" />
                <div className="w-4 h-4 rounded-full bg-background border border-border -mr-2 shrink-0" />
              </div>

              <div className="px-5 py-4 space-y-2.5">
                {data.sessions.map((s) => (
                  <div
                    key={s.parkingSessionId}
                    className="flex justify-between text-sm"
                  >
                    <span className="font-mono text-muted-foreground">
                      {s.vehicleNumber}
                    </span>
                    <span className="text-foreground font-medium">
                      {formatAmount(s.amountPaise)}
                    </span>
                  </div>
                ))}
                {multiSession && (
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">
                      Total paid
                    </span>
                    <span className="font-heading font-bold text-primary">
                      {formatAmount(data.combinedAmountPaise)}
                    </span>
                  </div>
                )}
                {!multiSession && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-heading font-bold text-primary">
                      {formatAmount(data.combinedAmountPaise)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button
              className="w-full h-12"
              onClick={() => router.replace("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </motion.div>
        )}

        {/* ── REJECTED ────────────────────────────────────────────────── */}
        {data.status === "REJECTED" && (
          <motion.div key="rejected" {...FADE} className="space-y-4">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 overflow-hidden">
              <div className="h-0.5 bg-destructive w-full" />
              <div className="px-6 py-8 text-center space-y-2">
                <IconCircleX size={44} className="text-destructive mx-auto" />
                <h2 className="font-heading font-bold text-2xl text-foreground">
                  Request Rejected
                </h2>
                {data.rejectionReason && (
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    "{data.rejectionReason}"
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Contact staff at the exit for help.
                </p>
              </div>
            </div>
            <Button
              className="w-full h-12"
              onClick={() => router.push("/dashboard")}
            >
              Request Again
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.replace("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </motion.div>
        )}

        {/* ── EXPIRED ─────────────────────────────────────────────────── */}
        {data.status === "EXPIRED" && (
          <motion.div key="expired" {...FADE} className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
              <div className="px-6 py-8 text-center space-y-2">
                <IconHourglass
                  size={44}
                  className="text-muted-foreground mx-auto"
                />
                <h2 className="font-heading font-bold text-2xl text-foreground">
                  Request Expired
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  The checkout window closed. Request a new one from the
                  dashboard.
                </p>
              </div>
            </div>
            <Button
              className="w-full h-12"
              onClick={() => router.replace("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price breakdown dialog */}
      {breakdownSession && (
        <PriceBreakdownDialog
          open={!!breakdownSession}
          onOpenChange={(v) => {
            if (!v) setBreakdownSession(null);
          }}
          sessionId={breakdownSession.parkingSessionId}
          spaceName=""
          vehicleType={breakdownSession.vehicleType as VehicleType}
          vehicleNumber={breakdownSession.vehicleNumber}
          durationMinutes={
            breakdownSession.checkedOutAt
              ? Math.floor(
                  (new Date(breakdownSession.checkedOutAt).getTime() -
                    new Date(breakdownSession.checkedInAt).getTime()) /
                    60000,
                )
              : null
          }
          amountPaise={breakdownSession.amountPaise}
          checkedInAt={breakdownSession.checkedInAt}
        />
      )}
    </>
  );
}
