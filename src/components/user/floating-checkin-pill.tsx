"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { IconCar } from "@tabler/icons-react";
import { getCountdownRgb } from "@/lib/countdown-color";

// ── Pill geometry ─────────────────────────────────────────────────────────────
const W = 260;
const H = 44;
const STROKE = 4;
const PATH_LEN = 1000;

const rX = STROKE / 2;
const rY = STROKE / 2;
const rW = W - STROKE;
const rH = H - STROKE;
const RX = rH / 2; // full pill border-radius = 20
const cx = W / 2;

// Clockwise SVG path starting at top-center (12 o'clock)
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

const TOTAL_MS = 5 * 60 * 1000;

interface StoredSession {
  spaceName: string;
  expiresAt: number;
}

export function FloatingCheckinPill() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [remaining, setRemaining] = useState(0);

  // Read + poll localStorage
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem("pending_checkin");
        if (!raw) {
          setSession(null);
          return;
        }
        const p = JSON.parse(raw) as StoredSession;
        if (p.expiresAt > Date.now()) {
          setSession({ spaceName: p.spaceName, expiresAt: p.expiresAt });
        } else {
          setSession(null);
          localStorage.removeItem("pending_checkin");
        }
      } catch {
        setSession(null);
      }
    }
    read();
    const id = setInterval(read, 2000);
    return () => clearInterval(id);
  }, []);

  // interval-driven countdown (100ms → smooth enough with CSS transition)
  useEffect(() => {
    if (!session) return;
    const expiresAt = session.expiresAt;

    function update() {
      const r = Math.max(0, expiresAt - Date.now());
      setRemaining(r);
      if (r === 0) {
        setSession(null);
        localStorage.removeItem("pending_checkin");
      }
    }

    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [session?.expiresAt]);

  const pathname = usePathname();
  if (!session || remaining === 0 || pathname === "/checkin") return null;

  const pct = Math.max(0, Math.min(1, remaining / TOTAL_MS));
  const sweepLen = pct * PATH_LEN;
  const [r, g, b] = getCountdownRgb(pct);
  const color = `rgb(${r},${g},${b})`;
  const trackClr = `rgba(${r},${g},${b},0.18)`;
  const bgClr = `rgba(${r},${g},${b},0.18)`;

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timer = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <button
      type="button"
      onClick={() => router.push("/checkin")}
      aria-label={`Active checkin session at ${session.spaceName} — ${timer} remaining`}
      className="fixed bottom-[84px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 focus-visible:outline-none"
      style={{ width: W, height: H }}
    >
      {/* Animated SVG border ring */}
      <svg
        width={W}
        height={H}
        className="absolute inset-0 pointer-events-none overflow-visible"
        aria-hidden="true"
      >
        {/* Static track — neutral, not color-tinted to avoid double-glow */}
        <path
          d={RING_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={STROKE}
          strokeLinejoin="round"
          pathLength={PATH_LEN}
        />
        {/* Animated arc — depletes clockwise */}
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

      {/* Pill body — frosted glass, tinted background */}
      <div
        className="absolute inset-[3px] rounded-full flex items-center justify-between px-3.5 gap-3 backdrop-blur-md transition-[filter] duration-200 hover:brightness-110 active:scale-[0.97]"
        style={{
          background: bgClr,
          transitionProperty: "filter, transform",
        }}
      >
        {/* Left: icon + space name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <IconCar size={13} style={{ color, flexShrink: 0 }} />
          <span
            className="text-sm font-semibold leading-none truncate"
            style={{ color }}
          >
            {session.spaceName}
          </span>
        </div>

        {/* Right: countdown */}
        <span
          className="font-mono text-sm font-bold tabular-nums shrink-0 leading-none"
          style={{ color }}
        >
          {timer}
        </span>
      </div>
    </button>
  );
}
