// src/hooks/use-subscription-expiry.ts
"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { pageFetcher } from "@/lib/swr-fetcher";
import { getCountdownRgb } from "@/lib/countdown-color";
import type { BusinessSubscriptionDetail } from "@/shared/types/subscription";

interface BusinessData {
  businessId: string;
}

/**
 * Computes the deletion deadline: next 1am UTC after (expiresAt + 7 days).
 * Matches the demo-cleanup cron schedule.
 */
function computeDeletionAt(expiresAt: Date): Date {
  const afterSevenDays = new Date(
    expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const d = new Date(afterSevenDays);
  d.setUTCHours(1, 0, 0, 0);
  if (d < afterSevenDays) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "0m";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}

export interface SubscriptionExpiryState {
  isExpired: boolean;
  deletionAt: Date | null;
  /** 0–1: fraction of the grace window remaining (1 = just expired, 0 = deletion imminent) */
  pct: number;
  countdownLabel: string;
  /** [r, g, b] from getCountdownRgb */
  rgbColor: [number, number, number];
  /** True when subscription data has resolved (prevents initial pct jump) */
  loaded: boolean;
}

/**
 * Works for both owner (pass no businessId — fetches /businesses/me first)
 * and staff (pass explicit businessId from staffMember.businessId).
 */
export function useSubscriptionExpiry(
  businessId?: string,
): SubscriptionExpiryState {
  // For owner path: resolve businessId from /businesses/me
  const { data: business } = useSWR<BusinessData>(
    businessId ? null : ["/businesses/me"],
    pageFetcher,
  );

  const resolvedId = businessId ?? business?.businessId;

  const { data: subDetail } = useSWR<BusinessSubscriptionDetail>(
    resolvedId ? [`/businesses/${resolvedId}/subscription`] : null,
    pageFetcher,
    { refreshInterval: 60_000 },
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!subDetail) {
    return {
      isExpired: false,
      deletionAt: null,
      pct: 1,
      countdownLabel: "",
      rgbColor: [212, 160, 23],
      loaded: false,
    };
  }

  const sub = subDetail.subscription;
  const status = sub.status;
  const expiresAt = new Date(sub.expiresAt);
  const graceExpiresAt = sub.graceExpiresAt
    ? new Date(sub.graceExpiresAt)
    : null;

  // Real-time expiry check: status field OR time-based check for DEMO/GRACE
  const isExpired =
    status === "EXPIRED" ||
    status === "CANCELLED" ||
    (status === "DEMO" && expiresAt.getTime() < now) ||
    (status === "GRACE" &&
      graceExpiresAt !== null &&
      graceExpiresAt.getTime() < now);

  if (!isExpired) {
    return {
      isExpired: false,
      deletionAt: null,
      pct: 1,
      countdownLabel: "",
      rgbColor: [212, 160, 23],
      loaded: true,
    };
  }

  // Use graceExpiresAt as the expiry point if available (more accurate window start)
  const effectiveExpiredAt = graceExpiresAt ?? expiresAt;
  const deletionAt = computeDeletionAt(effectiveExpiredAt);
  const totalWindow = deletionAt.getTime() - effectiveExpiredAt.getTime();
  const remaining = Math.max(0, deletionAt.getTime() - now);
  const pct = totalWindow > 0 ? remaining / totalWindow : 0;
  const rgbColor = getCountdownRgb(pct);
  const countdownLabel = formatCountdown(remaining);

  return { isExpired, deletionAt, pct, countdownLabel, rgbColor, loaded: true };
}
