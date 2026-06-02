// src/components/shared/subscription-expiry-banner.tsx
"use client";

import Link from "next/link";
import { useSubscriptionExpiry } from "@/hooks/use-subscription-expiry";

interface Props {
  /** Staff passes their businessId explicitly; owner omits it. */
  businessId?: string;
  /** Link target — owner goes to /owner/subscription, staff to a read-only info page */
  planHref?: string;
}

export function SubscriptionExpiryBanner({
  businessId,
  planHref = "/owner/subscription",
}: Props) {
  const { isExpired, pct, countdownLabel, rgbColor, loaded } =
    useSubscriptionExpiry(businessId);

  if (!isExpired) return null;

  const [r, g, b] = rgbColor;
  const stripColor = `rgb(${r},${g},${b})`;
  const stripWidthPct = `${Math.round(pct * 100)}%`;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-16 md:bottom-0 z-50 bg-background border-t border-destructive/30 shadow-lg"
    >
      {/* Receding progress strip — shrinks left-to-right as deletion approaches */}
      {loaded && (
        <div
          className="h-[3px] transition-all duration-1000"
          style={{ width: stripWidthPct, backgroundColor: stripColor }}
        />
      )}

      {/* Banner body */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-semibold text-destructive">
            Subscription expired.
          </span>{" "}
          All operations are locked.{" "}
          {countdownLabel && (
            <span
              style={{ color: stripColor }}
              className="font-semibold tabular-nums"
            >
              {countdownLabel}
            </span>
          )}{" "}
          {countdownLabel && "until your data is permanently deleted."}
        </p>
        <Link
          href={planHref}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Select a plan
        </Link>
      </div>
    </div>
  );
}
