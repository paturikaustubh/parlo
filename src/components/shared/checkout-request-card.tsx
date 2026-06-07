"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconClock,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconHelpCircle,
} from "@tabler/icons-react";
import type { CheckoutRequest } from "@/shared/types/entities";
import type { VehicleType } from "@/shared/types/enums";
import { PriceBreakdownDialog } from "@/components/user/price-breakdown-dialog";
import { ContactChip } from "@/components/shared/contact-chip";
import { formatAmount } from "@/lib/vehicle-utils";
import { useTimeFormat } from "@/hooks/use-time-format";
import { clockTime } from "@/lib/time";

interface CheckoutRequestCardProps {
  req: CheckoutRequest;
  onApprove?: () => void;
  onReject?: () => void;
  acting?: boolean;
  selfUserId?: string; // current staff user's UUID — disables self-approval
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtTime(d: Date, use12: boolean) {
  return clockTime(d.toISOString(), use12);
}
function fmtShortDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function fmtElapsed(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function compactDuration(
  checkedInAt: string,
  now: number,
  use12: boolean,
  checkedOutAt?: string | null,
): string {
  const start = new Date(checkedInAt);
  const end = checkedOutAt ? new Date(checkedOutAt) : new Date(now);
  const secs = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / 1000),
  );
  const sameDay = start.toDateString() === end.toDateString();
  const s = sameDay
    ? fmtTime(start, use12)
    : `${fmtShortDate(start)}, ${fmtTime(start, use12)}`;
  const e = sameDay
    ? fmtTime(end, use12)
    : `${fmtShortDate(end)}, ${fmtTime(end, use12)}`;
  return `${s} → ${e}  ·  ${fmtElapsed(secs)}`;
}

function timeAgo(iso: string, now: number): string {
  const secs = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  return fmtElapsed(secs) + " ago";
}

export function CheckoutRequestCard({
  req,
  onApprove,
  onReject,
  acting,
  selfUserId,
}: CheckoutRequestCardProps) {
  const { use12 } = useTimeFormat();
  const [breakdownSession, setBreakdownSession] = useState<
    CheckoutRequest["sessions"][number] | null
  >(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isStale =
    req.status === "PENDING" &&
    now - new Date(req.createdAt).getTime() > STALE_THRESHOLD_MS;

  const statusColor =
    req.status === "PENDING"
      ? "text-primary border-primary/30"
      : req.status === "APPROVED"
        ? "text-green-500 border-green-500/30"
        : "text-destructive border-destructive/30";

  return (
    <>
      <Card
        className={`overflow-hidden transition-colors ${isStale ? "border-destructive/40 bg-destructive/5" : ""}`}
      >
        <CardContent className="p-0">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="px-4 pt-3.5 pb-3 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              {/* Code + badge */}
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-2xl text-foreground tracking-widest leading-none">
                  {req.requestCode}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${statusColor}`}
                >
                  {req.status}
                </Badge>
              </div>

              {/* Approver — APPROVED only */}
              {req.status === "APPROVED" && req.approverName && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="opacity-50">by</span>
                  <ContactChip
                    name={req.approverName}
                    phone={req.approverPhone}
                    label="Approver"
                  />
                </div>
              )}

              {/* Elapsed — PENDING only */}
              {req.status === "PENDING" && (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <IconClock size={11} className="shrink-0" />
                  {timeAgo(req.createdAt, now)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="font-heading font-bold text-lg text-primary tabular-nums">
                {formatAmount(req.combinedAmountPaise)}
              </span>
              {req.sessions[0] && (
                <button
                  type="button"
                  onClick={() => setBreakdownSession(req.sessions[0])}
                  aria-label="View price breakdown"
                  className="text-muted-foreground/50 hover:text-primary transition-colors"
                >
                  <IconHelpCircle size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ── Stale warning ────────────────────────────────────────────── */}
          {isStale && (
            <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 bg-destructive/8 border border-destructive/20">
              <IconAlertTriangle
                size={12}
                className="text-destructive shrink-0"
              />
              <p className="text-[11px] text-destructive leading-snug">
                Waiting {timeAgo(req.createdAt, now)} — verify before approving
              </p>
            </div>
          )}

          {/* ── Sessions ─────────────────────────────────────────────────── */}
          <div className="border-t border-border/50 px-4 pt-3 pb-0 space-y-2.5">
            {req.sessions.map((s) => (
              <div key={s.parkingSessionId} className="space-y-0.5">
                {/* Plate + parker on same row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-sm text-foreground tracking-wider">
                    {s.vehicleNumber}
                  </span>
                  {req.userName && (
                    <ContactChip
                      name={req.userName}
                      phone={req.userPhone}
                      label="Parker"
                    />
                  )}
                </div>
                {/* Duration — own line, muted */}
                <p className="text-xs text-muted-foreground tabular-nums">
                  {compactDuration(s.checkedInAt, now, use12, s.checkedOutAt)}
                </p>
              </div>
            ))}
          </div>

          {/* ── Actions ──────────────────────────────────────────────────── */}
          {req.status === "PENDING" && (onApprove || onReject) && (
            <div className="border-t border-border/50 px-4 py-3 flex gap-2">
              {onReject && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs font-semibold text-destructive border-destructive/20 hover:bg-destructive/8"
                  disabled={acting}
                  onClick={onReject}
                >
                  <IconX size={13} /> Reject
                </Button>
              )}
              {onApprove &&
                (() => {
                  const isSelf = !!selfUserId && req.userId === selfUserId;
                  return isSelf ? (
                    <div className="flex-1 flex items-center justify-center h-9 text-[11px] text-muted-foreground italic px-2 text-center">
                      {"Sorry, can't checkout yourself :)"}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1 h-9 text-xs font-semibold"
                      disabled={acting}
                      onClick={onApprove}
                    >
                      <IconCheck size={13} />
                      {acting ? "Approving…" : "Approve"}
                    </Button>
                  );
                })()}
            </div>
          )}
        </CardContent>
      </Card>

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
