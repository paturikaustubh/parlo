"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconHelpCircle } from "@tabler/icons-react";
import { PriceBreakdownDialog } from "./price-breakdown-dialog";
import { apiFetch } from "@/lib/api-client";
import {
  VEHICLE_ICONS,
  TYPE_TO_DISPLAY,
  formatAmount,
} from "@/lib/vehicle-utils";
import type { ParkingSession, CheckoutRequest } from "@/shared/types/entities";

interface ActiveSessionCardProps {
  session: ParkingSession & { estimatedAmountPaise?: number };
}

export function ActiveSessionCard({ session }: ActiveSessionCardProps) {
  const router = useRouter();
  const timerRef = useRef<HTMLSpanElement>(null);
  const [requesting, setRequesting] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  useEffect(() => {
    const start = new Date(session.checkedInAt).getTime();

    function update() {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(elapsed / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((elapsed % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s = (elapsed % 60).toString().padStart(2, "0");
      if (timerRef.current) timerRef.current.textContent = `${h}:${m}:${s}`;
    }

    update();
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [session.checkedInAt]);

  async function handleCheckout() {
    setRequesting(true);
    try {
      const req = await apiFetch<CheckoutRequest>("/checkout/requests", {
        method: "POST",
        body: JSON.stringify({ sessionIds: [session.parkingSessionId] }),
      });
      router.push(`/checkout/${req.checkoutRequestId}`);
    } catch (err) {
      const { showToast } = await import("@/components/ui/toast");
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to create checkout request.",
        "error",
      );
      setRequesting(false);
    }
  }

  const Icon = VEHICLE_ICONS[session.vehicleType];

  return (
    <Card className="w-full border-primary/20 bg-card">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-heading font-bold text-lg text-foreground leading-tight truncate">
              {session.space.name}
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-primary border-primary/30 bg-primary/8 text-[10px] shrink-0"
          >
            ACTIVE
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Icon size={16} className="text-muted-foreground" />
          <span className="font-mono font-bold text-sm text-foreground tracking-wider">
            {session.vehicleNumber}
          </span>
          <span className="text-xs text-muted-foreground">
            {TYPE_TO_DISPLAY[session.vehicleType]}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
              Duration
            </p>
            <span
              ref={timerRef}
              className="font-mono font-bold text-xl text-foreground tabular-nums"
            >
              00:00:00
            </span>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
              Est. cost
            </p>
            <span className="inline-flex items-center gap-1">
              <span className="font-heading font-bold text-xl text-primary">
                {formatAmount(
                  session.estimatedAmountPaise ?? session.amountPaise,
                )}
              </span>
              <button
                type="button"
                onClick={() => setBreakdownOpen(true)}
                aria-label="View price breakdown"
                className="text-muted-foreground/50 hover:text-primary transition-colors"
              >
                <IconHelpCircle size={14} />
              </button>
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleCheckout}
          disabled={requesting}
        >
          {requesting ? "Requesting…" : "Request Checkout"}
        </Button>
      </CardContent>
      <PriceBreakdownDialog
        open={breakdownOpen}
        onOpenChange={setBreakdownOpen}
        sessionId={session.parkingSessionId}
        spaceName={session.space.name}
        vehicleType={session.vehicleType}
        vehicleNumber={session.vehicleNumber}
        durationMinutes={session.durationMinutes}
        amountPaise={session.estimatedAmountPaise ?? session.amountPaise ?? 0}
        checkedInAt={session.checkedInAt}
      />
    </Card>
  );
}
