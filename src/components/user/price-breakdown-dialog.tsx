"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { TYPE_TO_DISPLAY, VEHICLE_ICONS } from "@/lib/vehicle-utils";
import { PricingGrid, type PricingRule } from "./pricing-grid";
import type { VehicleType } from "@/shared/types/enums";

interface SessionPricingResponse {
  rules: PricingRule[];
  formulaType: string;
  cycleDurationHours: number | null;
  overflowIntervalMinutes: number | null;
  overflowAmountPaise: number | null;
  since: string | null;
  until: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
  spaceName: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  durationMinutes: number | null;
  amountPaise: number | null;
  checkedInAt?: string;
}

export function PriceBreakdownDialog({
  open,
  onOpenChange,
  sessionId,
  spaceName,
  vehicleType,
  vehicleNumber,
  durationMinutes,
  amountPaise,
  checkedInAt,
}: Props) {
  const [data, setData] = useState<SessionPricingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Re-render every 30s while open + active so slab highlight stays current
  useEffect(() => {
    if (!open || durationMinutes !== null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [open, durationMinutes]);

  useEffect(() => {
    if (!open || !sessionId) return;
    setData(null);
    setLoading(true);
    apiFetch<SessionPricingResponse>(`/sessions/${sessionId}/pricing`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, sessionId]);

  // For active sessions (durationMinutes is null), compute from checkedInAt
  const effectiveDuration =
    durationMinutes ??
    (checkedInAt
      ? Math.floor((now - new Date(checkedInAt).getTime()) / 60000)
      : null);

  const Icon = VEHICLE_ICONS[vehicleType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Price breakdown</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle header */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon size={16} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono font-bold text-sm text-foreground">
                {vehicleNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {TYPE_TO_DISPLAY[vehicleType]} · {spaceName}
              </p>
            </div>
            {amountPaise != null && (
              <p className="font-heading font-bold text-lg text-primary shrink-0">
                ₹{(amountPaise / 100).toLocaleString("en-IN")}
              </p>
            )}
          </div>

          {/* Versioned pricing grid */}
          {loading ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : data ? (
            <PricingGrid
              rules={data.rules}
              supportedVehicleTypes={[]}
              highlightVehicleType={vehicleType}
              highlightDurationMinutes={effectiveDuration}
              formulaType={data.formulaType}
              cycleDurationHours={data.cycleDurationHours}
              overflowIntervalMinutes={data.overflowIntervalMinutes}
              overflowAmountPaise={data.overflowAmountPaise}
              since={data.since}
              until={data.until}
            />
          ) : null}

          {durationMinutes === null && checkedInAt && (
            <p className="text-[10px] text-muted-foreground/60 text-center -mt-1">
              Highlighted slab based on current elapsed time
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
