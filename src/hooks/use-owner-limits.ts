import useSWR from "swr";
import { pageFetcher } from "@/lib/swr-fetcher";

interface PlanFeatures {
  dutyTracking: boolean;
  staffPerformance: boolean;
  amountOverride: boolean;
  prioritySupport: boolean;
}

interface Plan {
  name: string;
  slug: string;
  maxSpaces: number | null;
  maxStaff: number | null;
  analyticsDays: number | null;
  features: PlanFeatures;
}

interface BusinessData {
  businessId: string;
}

import { useState, useEffect } from "react";

interface SubscriptionResponse {
  subscription: {
    status: string;
    expiresAt: string;
    graceExpiresAt?: string | null;
  };
  plan: Plan;
  usage: { spacesUsed: number; staffUsed: number };
}

export function useOwnerLimits() {
  const { data: business } = useSWR<BusinessData>(
    ["/businesses/me"],
    pageFetcher,
  );

  const { data: sub } = useSWR<SubscriptionResponse>(
    business?.businessId
      ? [`/businesses/${business.businessId}/subscription`]
      : null,
    pageFetcher,
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const status = sub?.subscription?.status;
  const expiresAt = sub?.subscription?.expiresAt
    ? new Date(sub.subscription.expiresAt).getTime()
    : null;
  const graceExpiresAt = sub?.subscription?.graceExpiresAt
    ? new Date(sub.subscription.graceExpiresAt).getTime()
    : null;

  const isExpired =
    status === "EXPIRED" ||
    status === "CANCELLED" ||
    (status === "DEMO" && expiresAt !== null && expiresAt < now) ||
    (status === "GRACE" && graceExpiresAt !== null && graceExpiresAt < now);

  const atSpaceLimit =
    isExpired ||
    (sub !== undefined &&
      sub.plan.maxSpaces !== null &&
      sub.usage.spacesUsed >= sub.plan.maxSpaces);

  const atStaffLimit =
    isExpired ||
    (sub !== undefined &&
      sub.plan.maxStaff !== null &&
      sub.usage.staffUsed >= sub.plan.maxStaff);

  function hasFeature(feature: keyof PlanFeatures): boolean {
    if (!sub || isExpired) return false;
    return sub.plan.features[feature] ?? false;
  }

  return { sub, status, isExpired, atSpaceLimit, atStaffLimit, hasFeature };
}
