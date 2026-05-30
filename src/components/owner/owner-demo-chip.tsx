"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { pageFetcher } from "@/lib/swr-fetcher";
import { getCountdownRgb } from "@/lib/countdown-color";

// ── Pill geometry ─────────────────────────────────────────────────────────────
const W = 170;
const H = 32;
const STROKE = 3;
const PATH_LEN = 1000;
const rX = STROKE / 2;
const rY = STROKE / 2;
const rW = W - STROKE;
const rH = H - STROKE;
const RX = rH / 2;
const cx = W / 2;

const RING_PATH = [
  `M ${cx} ${rY}`,
  `L ${rX + rW - RX} ${rY}`,
  `A ${RX} ${RX} 0 0 1 ${rX + rW} ${rY + RX}`,
  `L ${rX + rW} ${rY + rH - RX}`,
  `A ${RX} ${RX} 0 0 1 ${rX + rW - RX} ${rY + rH}`,
  `L ${rX + RX} ${rY + rH}`,
  `A ${RX} ${RX} 0 0 1 ${rX} ${rY + rH - RX}`,
  `L ${rX} ${rY + RX}`,
  `A ${RX} ${RX} 0 0 1 ${rX + RX} ${rY}`,
  `L ${cx} ${rY}`,
].join(" ");

// ── Mobile circle geometry ────────────────────────────────────────────────────
const CR = 11;
const CIRC = 2 * Math.PI * CR;

// Container dimensions: pill (170) + 8px padding each side = 186
// Height: 8 + pill(32) + 8 + button(32) + 8 = 88
const CW = 186;
const CH = 88;
const PAD = 8;

interface BusinessInfo {
  businessId: string;
}
interface SubscriptionResponse {
  subscription: { status: string; startsAt: string; expiresAt: string };
}

// ── Island container: mounts collapsed (circle), grows into frosted glass box ─
interface IslandProps {
  top: number;
  right: number;
  pct: number;
  color: string;
  r: number;
  g: number;
  b: number;
  displayValue: number;
  label: string;
  onSubscribe: () => void;
}

function Island({
  top,
  right,
  pct,
  color,
  r,
  g,
  b,
  displayValue,
  label,
  onSubscribe,
}: IslandProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let id1: number;
    let id2: number;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setOpen(true));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, []);

  const bgClr = `rgba(${r},${g},${b},0.12)`;
  const sweepLen = pct * PATH_LEN;

  // Keep pill vertically centered at chip position: (top+14) = (open_top + CH/2)?
  // We just anchor top to chip top and let the box grow down.
  const containerTop = open ? top - 2 : top;

  return (
    <div
      style={{
        position: "fixed",
        right,
        top: containerTop,
        width: open ? CW : 28,
        height: open ? CH : 28,
        borderRadius: open ? 20 : 14,
        overflow: "hidden",
        background: open ? "rgba(10,10,10,0.88)" : "transparent",
        backdropFilter: open ? "blur(28px)" : "none",
        WebkitBackdropFilter: open ? "blur(28px)" : "none",
        border: open ? "1px solid rgba(255,255,255,0.08)" : "none",
        boxShadow: open
          ? "0 12px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "none",
        zIndex: 60,
        transition: [
          "top 350ms cubic-bezier(0.32,0.72,0,1)",
          "width 350ms cubic-bezier(0.32,0.72,0,1)",
          "height 350ms cubic-bezier(0.32,0.72,0,1)",
          "border-radius 350ms cubic-bezier(0.32,0.72,0,1)",
          "background 280ms ease",
          "border 280ms ease",
          "box-shadow 280ms ease",
        ].join(", "),
      }}
    >
      {/* ── Collapsed face: circle ring + single value (fades out) ──────── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: open ? 0 : 1,
          transition: "opacity 160ms ease",
          pointerEvents: "none",
        }}
      >
        <svg
          width="28"
          height="28"
          style={{ position: "absolute", inset: 0 }}
          aria-hidden="true"
        >
          <circle cx="14" cy="14" r="12" fill={bgClr} />
          <circle
            cx="14"
            cy="14"
            r={CR}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="2.5"
          />
          <circle
            cx="14"
            cy="14"
            r={CR}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="butt"
            strokeDasharray={`${pct * CIRC} ${CIRC}`}
            transform="rotate(-90 14 14)"
          />
        </svg>
        <span
          style={{
            color,
            fontSize: 11,
            fontFamily: "monospace",
            fontWeight: 800,
            lineHeight: 1,
            position: "relative",
          }}
        >
          {displayValue}
        </span>
      </div>

      {/* ── Expanded face: pill + divider + nav button (fades in) ────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: open ? 1 : 0,
          transition: "opacity 220ms ease 130ms",
          pointerEvents: open ? "auto" : "none",
          display: "flex",
          flexDirection: "column",
          padding: PAD,
          gap: PAD,
        }}
      >
        {/* Desktop pill (exactly as on large screen) */}
        <div
          style={{
            position: "relative",
            width: W,
            height: H,
            flexShrink: 0,
          }}
        >
          {/* Pill ring SVG */}
          <svg
            width={W}
            height={H}
            style={{ position: "absolute", inset: 0 }}
            aria-hidden="true"
          >
            <path
              d={RING_PATH}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={STROKE}
              strokeLinejoin="round"
              pathLength={PATH_LEN}
            />
            <path
              d={RING_PATH}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeLinejoin="round"
              pathLength={PATH_LEN}
              strokeDasharray={`${sweepLen} ${PATH_LEN}`}
              strokeDashoffset={0}
              style={{
                transition: "stroke-dasharray 0.95s linear, stroke 0.8s ease",
              }}
            />
          </svg>
          {/* Pill body */}
          <div
            style={{
              position: "absolute",
              top: 2,
              left: 2,
              right: 2,
              bottom: 2,
              borderRadius: H / 2 - 2,
              background: bgClr,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              gap: 8,
            }}
          >
            <span
              style={{
                color,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                lineHeight: 1,
              }}
            >
              Demo
            </span>
            <span
              style={{
                color,
                fontSize: 11,
                fontFamily: "monospace",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          </div>
        </div>

        {/* Nav button */}
        <button
          type="button"
          onClick={onSubscribe}
          style={{
            width: W,
            height: H,
            flexShrink: 0,
            borderRadius: H / 2,
            background: `rgba(${r},${g},${b},0.14)`,
            border: `1px solid rgba(${r},${g},${b},0.22)`,
            color,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.03em",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          View Subscription →
        </button>
      </div>
    </div>
  );
}

// ── Main chip ─────────────────────────────────────────────────────────────────
export function OwnerDemoChip() {
  const router = useRouter();
  const [remaining, setRemaining] = useState(0);
  const [totalMs, setTotalMs] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const mobileRef = useRef<HTMLButtonElement>(null);
  const [popPos, setPopPos] = useState({ top: 0, right: 0 });

  const { data: business } = useSWR<BusinessInfo>(
    ["/businesses/me"],
    pageFetcher,
  );
  const { data: subData } = useSWR<SubscriptionResponse>(
    business?.businessId
      ? [`/businesses/${business.businessId}/subscription`]
      : null,
    pageFetcher,
  );

  const subscription = subData?.subscription;

  useEffect(() => {
    if (!subscription || subscription.status !== "DEMO") return;
    const expiresAt = new Date(subscription.expiresAt).getTime();
    const startsAt = new Date(subscription.startsAt).getTime();
    setTotalMs(Math.max(1, expiresAt - startsAt));
    function update() {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [subscription?.expiresAt, subscription?.startsAt, subscription?.status]);

  if (!subscription || subscription.status !== "DEMO" || remaining <= 0)
    return null;

  const pct = Math.min(1, remaining / totalMs);
  const [r, g, b] = getCountdownRgb(pct);
  const color = `rgb(${r},${g},${b})`;

  const days = Math.floor(remaining / 86400000);
  const hrs = Math.floor((remaining % 86400000) / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const label = `${days}:${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const displayValue = days > 0 ? days : hrs > 0 ? hrs : mins > 0 ? mins : secs;

  function handleOpen() {
    if (mobileRef.current) {
      const rect = mobileRef.current.getBoundingClientRect();
      setPopPos({ top: rect.top, right: window.innerWidth - rect.right });
    }
    setExpanded(true);
  }

  return (
    <>
      {/* ── Mobile: circular chip ─────────────────────────────────────────── */}
      <button
        ref={mobileRef}
        type="button"
        onClick={handleOpen}
        aria-label={`Demo ends in ${label}`}
        className="md:hidden focus-visible:outline-none shrink-0 active:scale-95"
        style={{
          width: 28,
          height: 28,
          position: "relative",
          opacity: expanded ? 0 : 1,
          pointerEvents: expanded ? "none" : "auto",
          transition: "opacity 150ms ease",
        }}
      >
        <svg
          width="28"
          height="28"
          style={{ position: "absolute", inset: 0 }}
          aria-hidden="true"
        >
          <circle cx="14" cy="14" r="12" fill={`rgba(${r},${g},${b},0.12)`} />
          <circle
            cx="14"
            cy="14"
            r={CR}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="2.5"
          />
          <circle
            cx="14"
            cy="14"
            r={CR}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="butt"
            strokeDasharray={`${pct * CIRC} ${CIRC}`}
            transform="rotate(-90 14 14)"
            style={{
              transition: "stroke-dasharray 0.95s linear, stroke 0.8s ease",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color,
              fontSize: 11,
              fontFamily: "monospace",
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {displayValue}
          </span>
        </div>
      </button>

      {/* ── Mobile: outside-click backdrop ───────────────────────────────── */}
      {expanded && (
        <div
          className="fixed inset-0 z-[59] md:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* ── Mobile: island container ──────────────────────────────────────── */}
      {expanded && (
        <Island
          top={popPos.top}
          right={popPos.right}
          pct={pct}
          color={color}
          r={r}
          g={g}
          b={b}
          displayValue={displayValue}
          label={label}
          onSubscribe={() => {
            setExpanded(false);
            router.push("/owner/subscription");
          }}
        />
      )}

      {/* ── Desktop: full pill ───────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => router.push("/owner/subscription")}
        aria-label={`Demo subscription ends in ${label}`}
        className="relative hidden md:flex focus-visible:outline-none shrink-0"
        style={{ width: W, height: H }}
      >
        <svg
          width={W}
          height={H}
          className="absolute inset-0 pointer-events-none overflow-visible"
          aria-hidden="true"
        >
          <path
            d={RING_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={STROKE}
            strokeLinejoin="round"
            pathLength={PATH_LEN}
          />
          <path
            d={RING_PATH}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="butt"
            strokeLinejoin="round"
            pathLength={PATH_LEN}
            strokeDasharray={`${pct * PATH_LEN} ${PATH_LEN}`}
            strokeDashoffset={0}
            style={{
              transition: "stroke-dasharray 0.95s linear, stroke 0.8s ease",
            }}
          />
        </svg>
        <div
          className="absolute inset-[2px] rounded-full flex items-center justify-between px-3 gap-2 hover:brightness-110 transition-[filter] active:scale-[0.97]"
          style={{ background: `rgba(${r},${g},${b},0.12)` }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color }}
          >
            Demo
          </span>
          <span
            className="font-mono text-[11px] font-bold tabular-nums shrink-0 leading-none"
            style={{ color }}
          >
            {label}
          </span>
        </div>
      </button>
    </>
  );
}
