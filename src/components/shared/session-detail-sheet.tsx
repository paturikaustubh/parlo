"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { IconClock } from "@tabler/icons-react";
import { ContactChip } from "@/components/shared/contact-chip";
import { PricingGrid, type PricingRule } from "@/components/user/pricing-grid";
import {
  formatAmount,
  formatTime,
  formatDuration,
  TYPE_TO_DISPLAY,
} from "@/lib/vehicle-utils";
import { useTimeFormat } from "@/hooks/use-time-format";
import type { ParkingSession } from "@/shared/types/entities";

interface SessionDetailSheetProps {
  session: ParkingSession | null;
  open: boolean;
  onClose: () => void;
  pricingRules: PricingRule[];
  pricingLoading: boolean;
  pricingSince: string | null;
  pricingUntil: string | null;
  pricingFormulaType: string | null;
  pricingCycleDurationHours: number | null;
  pricingOverflowIntervalMinutes: number | null;
  pricingOverflowAmountPaise: number | null;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "text-primary border-primary/30 bg-primary/8",
  COMPLETED: "text-emerald-500 border-emerald-500/30 bg-emerald-500/8",
  CHECKOUT_REQUESTED: "text-amber-500 border-amber-500/30 bg-amber-500/8",
};

export function SessionDetailSheet({
  session,
  open,
  onClose,
  pricingRules,
  pricingLoading,
  pricingSince,
  pricingUntil,
  pricingFormulaType,
  pricingCycleDurationHours,
  pricingOverflowIntervalMinutes,
  pricingOverflowAmountPaise,
}: SessionDetailSheetProps) {
  const { use12 } = useTimeFormat();
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-8 overflow-y-auto max-h-[90dvh]"
      >
        {session && (
          <>
            <SheetHeader className="mb-0">
              <div className="flex items-start justify-between gap-3 min-w-0">
                <SheetTitle className="text-left font-heading truncate flex-1 min-w-0">
                  {session.space.name}
                </SheetTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${STATUS_STYLES[session.status] ?? "text-muted-foreground border-border"}`}
                >
                  {session.status.replace("_", " ")}
                </Badge>
              </div>
            </SheetHeader>

            <div className="space-y-4 pt-4">
              {/* Vehicle + Amount — above timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Vehicle
                  </p>
                  <p className="font-mono font-bold text-sm text-foreground leading-tight">
                    {session.vehicleNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_TO_DISPLAY[session.vehicleType] ??
                      session.vehicleType}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Amount
                  </p>
                  <p className="font-heading font-bold text-lg text-primary leading-tight">
                    {session.amountPaise != null
                      ? formatAmount(session.amountPaise)
                      : (session as { estimatedAmountPaise?: number })
                            .estimatedAmountPaise != null
                        ? `${formatAmount((session as { estimatedAmountPaise?: number }).estimatedAmountPaise!)} est.`
                        : "—"}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Timeline
                </p>
                {/* Check-in row — dot column owns the connecting line */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0 self-stretch pt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="w-px flex-1 bg-border mt-1" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pb-3">
                    <span className="text-xs font-medium text-foreground">
                      Check-in
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatTime(session.checkedInAt, use12)}
                    </span>
                    {session.checkedInByName && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        by
                        <ContactChip
                          name={session.checkedInByName}
                          phone={session.checkedInByPhone}
                          label="Checked in by"
                        />
                      </span>
                    )}
                  </div>
                </div>
                {/* Check-out row — dot only, no line */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <div className="w-2 h-2 rounded-full border border-muted-foreground/50 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-foreground">
                      Check-out
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {session.checkedOutAt
                        ? formatTime(session.checkedOutAt, use12)
                        : "—"}
                    </span>
                    {session.checkedOutByName && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        by
                        <ContactChip
                          name={session.checkedOutByName}
                          phone={session.checkedOutByPhone}
                          label="Checked out by"
                        />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Parker identity */}
              {(session.guestName || session.userName) && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    Parker
                  </p>
                  <ContactChip
                    name={session.guestName ?? session.userName}
                    phone={session.guestPhone ?? session.userPhone}
                    label={session.guestName ? "Guest" : "Registered"}
                  />
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <IconClock
                  size={13}
                  className="text-muted-foreground shrink-0"
                />
                <span className="text-xs text-muted-foreground">Duration</span>
                <span className="text-xs font-medium text-foreground ml-auto">
                  {formatDuration(session.durationMinutes)}
                </span>
              </div>

              {/* Rate breakdown */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Rate breakdown
                </p>
                {pricingLoading ? (
                  <div className="space-y-1.5">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-7 rounded-lg bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <PricingGrid
                    rules={pricingRules}
                    supportedVehicleTypes={[]}
                    highlightVehicleType={session.vehicleType}
                    highlightDurationMinutes={session.durationMinutes}
                    since={pricingSince}
                    until={pricingUntil}
                    formulaType={pricingFormulaType}
                    cycleDurationHours={pricingCycleDurationHours}
                    overflowIntervalMinutes={pricingOverflowIntervalMinutes}
                    overflowAmountPaise={pricingOverflowAmountPaise}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
