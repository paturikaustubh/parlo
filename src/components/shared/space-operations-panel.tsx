"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getCountdownRgb } from "@/lib/countdown-color";
import QRCode from "react-qr-code";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  IconClock,
  IconClockOff,
  IconSearch,
  IconX,
  IconQrcode,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { showToast } from "@/components/ui/toast";
import { CheckoutRequestCard } from "@/components/shared/checkout-request-card";
import type { CheckoutRequest } from "@/shared/types/entities";

interface SpaceOperationsPanelProps {
  spaceId: string;
  spaceName?: string;
  selfUserId?: string; // current user's UUID — prevents self-approval in checkout cards
  isOnDuty?: boolean; // undefined = owner (no gate); false = staff off duty (blocked)
  isExpired?: boolean; // subscription expired — disable all mutating actions
}

interface SpaceQR {
  uuid: string;
  expiresAt: number;
  spaceName: string;
  ttlSeconds: number;
}

const QR_BORDER_PX = 6; // border ring thickness
const QR_GAP_PX = 10; // dark gap between ring and QR image
const QR_SIZE = 192; // react-qr-code size prop

export function SpaceOperationsPanel({
  spaceId,
  spaceName,
  selfUserId,
  isOnDuty,
  isExpired = false,
}: SpaceOperationsPanelProps) {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [animDuration, setAnimDuration] = useState(120);
  const [sweepDeg, setSweepDeg] = useState(360);
  const [ringColor, setRingColor] = useState("#d4a017");

  const [requests, setRequests] = useState<CheckoutRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const [isRegrowing, setIsRegrowing] = useState(false);
  const [checkoutQrOpen, setCheckoutQrOpen] = useState(false);

  const qrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regrowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevExpiresRef = useRef<number | null>(null);
  const initialisedRef = useRef(false);
  const mountedRef = useRef(true);

  // ── QR fetch ────────────────────────────────────────────────────────────────
  const fetchQr = useCallback(async () => {
    try {
      if (!mountedRef.current) return;
      const data = await apiFetch<SpaceQR>(`/spaces/${spaceId}/qr`);
      if (!mountedRef.current) return;
      setQrValue(`${window.location.origin}/g/checkin?token=${data.uuid}`);
      setQrExpiresAt(data.expiresAt);
      const msLeft = Math.max(0, data.expiresAt - Date.now());
      setAnimDuration(data.ttlSeconds); // TET — total lifetime, single source of truth
      qrTimerRef.current = setTimeout(fetchQr, msLeft);
    } catch {
      /* silent */
    }
  }, [spaceId]);

  // ── Requests fetch ──────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    if (!initialisedRef.current) setLoadingRequests(true);
    try {
      const res = await apiFetch<{ data: CheckoutRequest[] }>(
        `/checkout/requests?status=PENDING&spaceId=${spaceId}&pageSize=50`,
      );
      setRequests(res.data ?? []);
    } catch {
      /* silent */
    } finally {
      setLoadingRequests(false);
      initialisedRef.current = true;
    }
  }, [spaceId]);

  useEffect(() => {
    if (isOnDuty === false) return;
    mountedRef.current = true;
    fetchQr();
    fetchRequests();
    const interval = setInterval(fetchRequests, 10_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
      if (regrowTimerRef.current) clearTimeout(regrowTimerRef.current);
    };
  }, [fetchQr, fetchRequests, isOnDuty]);

  useEffect(() => {
    if (!qrExpiresAt) return;
    const totalMs = animDuration * 1000;
    const tick = () => {
      const remaining = Math.max(0, qrExpiresAt - Date.now());
      setSecondsLeft(Math.round(remaining / 1000));
      const pct = totalMs > 0 ? remaining / totalMs : 0;
      setSweepDeg(pct * 360);
      const [cr, cg, cb] = getCountdownRgb(pct);
      setRingColor(`rgb(${cr},${cg},${cb})`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [qrExpiresAt, animDuration]);

  // ── Detect QR refresh → trigger regrow animation ────────────────────────────
  useEffect(() => {
    if (!qrExpiresAt) return;
    if (
      prevExpiresRef.current !== null &&
      qrExpiresAt !== prevExpiresRef.current
    ) {
      setIsRegrowing(true);
      if (regrowTimerRef.current) clearTimeout(regrowTimerRef.current);
      regrowTimerRef.current = setTimeout(() => setIsRegrowing(false), 1700);
    }
    prevExpiresRef.current = qrExpiresAt;
  }, [qrExpiresAt]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleApprove(requestId: string) {
    setActingId(requestId);
    try {
      await apiFetch(`/checkout/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED" }),
      });
      showToast("Checkout approved.", "success");
      fetchRequests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(requestId: string, note: string) {
    setActingId(requestId);
    try {
      await apiFetch(`/checkout/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED", note }),
      });
      showToast("Checkout rejected.", "success");
      fetchRequests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    } finally {
      setActingId(null);
    }
  }

  function openRejectDialog(requestId: string) {
    setRejectTarget(requestId);
    setRejectNote("");
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const id = rejectTarget;
    setRejectTarget(null);
    await handleReject(id, rejectNote.trim());
    setRejectNote("");
  }

  // ── Fuse search ─────────────────────────────────────────────────────────────
  const fuse = useMemo(
    () =>
      new Fuse(requests, {
        keys: [
          { name: "requestCode", weight: 0.4 },
          { name: "sessions.vehicleNumber", weight: 0.3 },
          { name: "userName", weight: 0.2 },
          { name: "userPhone", weight: 0.1 },
        ],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
      }),
    [requests],
  );

  const filtered = query.trim()
    ? fuse.search(query).map((r) => r.item)
    : requests;

  const timerLabel =
    secondsLeft !== null
      ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
      : null;

  // SVG rect ring geometry
  const svgStroke = QR_BORDER_PX;
  const svgGap = QR_GAP_PX;
  const wbOuter = QR_SIZE + 24;
  const svgPad = svgGap + svgStroke / 2;
  const svgW = wbOuter + svgPad * 2;
  const svgH = wbOuter + svgPad * 2;
  const rectX = svgStroke / 2;
  const rectY = svgStroke / 2;
  const rectW = svgW - svgStroke;
  const rectH = svgH - svgStroke;
  const rectRx = 8 + svgGap + svgStroke / 2;
  const PATH_LEN = 1000;
  const sweepLen = (sweepDeg / 360) * PATH_LEN;
  const svgCx = svgW / 2;

  // Rounded-rect path starting at TOP-MIDDLE, clockwise
  const ringPath = [
    `M ${svgCx} ${rectY}`,
    `L ${rectX + rectW - rectRx} ${rectY}`,
    `A ${rectRx} ${rectRx} 0 0 1 ${rectX + rectW} ${rectY + rectRx}`,
    `L ${rectX + rectW} ${rectY + rectH - rectRx}`,
    `A ${rectRx} ${rectRx} 0 0 1 ${rectX + rectW - rectRx} ${rectY + rectH}`,
    `L ${rectX + rectRx} ${rectY + rectH}`,
    `A ${rectRx} ${rectRx} 0 0 1 ${rectX} ${rectY + rectH - rectRx}`,
    `L ${rectX} ${rectY + rectRx}`,
    `A ${rectRx} ${rectRx} 0 0 1 ${rectX + rectRx} ${rectY}`,
    `L ${svgCx} ${rectY}`,
  ].join(" ");

  if (isOnDuty === false) {
    return (
      <div className="rounded-2xl border border-dashed border-border flex flex-col items-center justify-center py-20 gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <IconClockOff size={26} className="text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            Off Duty
          </span>
          <p className="text-sm font-medium text-foreground mt-2">
            You&apos;re not on shift
          </p>
          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
            Start your shift to access the queue, show the QR code, and process
            checkout requests.
          </p>
        </div>
        <a
          href="/staff"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Start Shift
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* ── QR panel ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card">
          {/* QR + timer */}
          <div className="flex flex-col items-center gap-6 px-6 py-6">
            {qrValue ? (
              <>
                {/* QR + SVG ring wrapper */}
                <div className="relative inline-flex">
                  {/* SVG ring — absolutely positioned around the white QR box */}
                  <svg
                    width={svgW}
                    height={svgH}
                    style={{
                      position: "absolute",
                      top: -svgPad,
                      left: -svgPad,
                      pointerEvents: "none",
                    }}
                  >
                    <path
                      d={ringPath}
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth={svgStroke}
                      strokeLinejoin="round"
                      pathLength={PATH_LEN}
                    />
                    <path
                      d={ringPath}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth={svgStroke}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={PATH_LEN}
                      strokeDasharray={`${sweepLen} ${PATH_LEN}`}
                      strokeDashoffset={0}
                      style={{
                        transition: isRegrowing
                          ? "stroke-dasharray 1s cubic-bezier(.1,.09,0,.99), stroke 0.8s ease"
                          : "stroke-dasharray 0.95s linear, stroke 0.8s ease",
                      }}
                    />
                  </svg>
                  {/* white QR box */}
                  <div className="bg-white rounded-lg" style={{ padding: 12 }}>
                    <QRCode value={qrValue} size={QR_SIZE} level="L" />
                  </div>
                </div>

                {/* Timer pill */}
                {timerLabel !== null && (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-mono font-semibold"
                    style={{
                      borderColor: ringColor,
                      color: ringColor,
                    }}
                  >
                    <IconClock size={11} />
                    <span>Refreshes in {timerLabel}</span>
                  </div>
                )}
              </>
            ) : (
              <div
                className="rounded-xl bg-muted animate-pulse"
                style={{ width: QR_SIZE + 20, height: QR_SIZE + 20 }}
              />
            )}
          </div>
        </div>

        {/* ── Checkout requests ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Header + search */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Checkout requests
              {requests.length > 0 && (
                <span className="ml-1.5 font-mono text-foreground">
                  (
                  {query.trim()
                    ? `${filtered.length} of ${requests.length}`
                    : requests.length}
                  )
                </span>
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              disabled={isExpired}
              onClick={() => setCheckoutQrOpen(true)}
            >
              <IconQrcode size={13} />
              Checkout QR
            </Button>
          </div>

          <div className="relative">
            <IconSearch
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Search code, plate, name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 pr-8 h-9 text-sm"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconX size={13} />
              </button>
            )}
          </div>

          {/* List */}
          {loadingRequests ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center space-y-1.5">
              <IconClock
                size={22}
                className="text-muted-foreground/50 mx-auto"
              />
              <p className="text-xs text-muted-foreground">
                No pending requests
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((req) => (
                <CheckoutRequestCard
                  key={req.checkoutRequestId}
                  req={req}
                  acting={actingId === req.checkoutRequestId}
                  selfUserId={selfUserId}
                  onApprove={
                    isExpired
                      ? undefined
                      : () => handleApprove(req.checkoutRequestId)
                  }
                  onReject={
                    isExpired
                      ? undefined
                      : () => openRejectDialog(req.checkoutRequestId)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Reject dialog ────────────────────────────────────────────────────── */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject checkout request</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Reason (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="resize-none text-sm"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isExpired}
              onClick={confirmReject}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Checkout QR dialog ──────────────────────────────────────────────── */}
      <Dialog open={checkoutQrOpen} onOpenChange={setCheckoutQrOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Checkout QR</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2 pb-4">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-border">
              <QRCode
                value={`${window.location.origin}/g/checkout`}
                size={192}
                level="L"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Customers scan this to request checkout
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
