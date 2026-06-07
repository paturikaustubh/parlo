import { prisma } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";

interface PlanFeatures {
  dutyTracking: boolean;
  staffPerformance: boolean;
  amountOverride: boolean;
  prioritySupport: boolean;
}

async function getSubscriptionWithPlan(businessId: number) {
  const sub = await prisma.businessSubscription.findUnique({
    where: { businessId },
    include: { plan: true },
  });
  if (!sub)
    throw new ForbiddenError(
      "NO_SUBSCRIPTION",
      "No subscription found for this business.",
    );
  return sub;
}

function assertStatusActive(sub: {
  status: string;
  expiresAt: Date;
  graceExpiresAt: Date | null;
  plan: { name: string };
}) {
  const now = new Date();
  // Real-time enforcement — cron updates DB status once/day but expiry must be instant
  if (sub.status === "DEMO" && sub.expiresAt < now)
    throw new ForbiddenError(
      "SUBSCRIPTION_EXPIRED",
      "Your demo trial has expired. Please subscribe to continue.",
    );
  if (sub.status === "GRACE" && sub.graceExpiresAt && sub.graceExpiresAt < now)
    throw new ForbiddenError(
      "SUBSCRIPTION_EXPIRED",
      "Your grace period has ended. Please renew to continue.",
    );
  if (sub.status === "EXPIRED")
    throw new ForbiddenError(
      "SUBSCRIPTION_EXPIRED",
      `Your ${sub.plan.name} subscription has expired. Please renew to continue.`,
    );
  if (sub.status === "CANCELLED")
    throw new ForbiddenError(
      "SUBSCRIPTION_CANCELLED",
      "Your subscription has been cancelled. Please contact support.",
    );
}

export async function assertSpaceLimit(businessId: number) {
  const sub = await getSubscriptionWithPlan(businessId);
  assertStatusActive(sub);
  if (sub.plan.maxSpaces === null) return; // unlimited (Pro/Demo)
  const count = await prisma.space.count({
    where: { businessId, isActive: true },
  });
  if (count >= sub.plan.maxSpaces)
    throw new ForbiddenError(
      "PLAN_LIMIT_EXCEEDED",
      `Your ${sub.plan.name} plan allows up to ${sub.plan.maxSpaces} space(s). Upgrade to add more.`,
    );
}

export async function assertStaffLimit(businessId: number) {
  const sub = await getSubscriptionWithPlan(businessId);
  assertStatusActive(sub);
  if (sub.plan.maxStaff === null) return; // unlimited (Pro/Demo)
  const count = await prisma.staffMember.count({
    where: { businessId, status: { not: "REMOVED" } },
  });
  if (count >= sub.plan.maxStaff)
    throw new ForbiddenError(
      "PLAN_LIMIT_EXCEEDED",
      `Your ${sub.plan.name} plan allows up to ${sub.plan.maxStaff} staff member(s). Upgrade to add more.`,
    );
}

export async function assertFeatureEnabled(
  businessId: number,
  feature: keyof PlanFeatures,
) {
  const sub = await getSubscriptionWithPlan(businessId);
  assertStatusActive(sub);
  const features = sub.plan.features as unknown as PlanFeatures;
  if (!features[feature])
    throw new ForbiddenError(
      "FEATURE_NOT_AVAILABLE",
      `This feature requires a higher plan. Upgrade to unlock it.`,
    );
}

export async function assertBusinessSubscriptionActive(businessId: number) {
  const sub = await getSubscriptionWithPlan(businessId);
  assertStatusActive(sub);
}

export async function getOwnerAnalyticsConfig(businessId: number): Promise<{
  cutoffDate: Date | null;
  staffPerformanceEnabled: boolean;
}> {
  const sub = await getSubscriptionWithPlan(businessId);
  const cutoffDate =
    sub.plan.analyticsDays === null
      ? null
      : new Date(Date.now() - sub.plan.analyticsDays * 24 * 60 * 60 * 1000);
  const features = sub.plan.features as Record<string, boolean>;
  const staffPerformanceEnabled = features?.staffPerformance === true;
  return { cutoffDate, staffPerformanceEnabled };
}
