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

function assertStatusActive(status: string, planName: string) {
  if (status === "EXPIRED")
    throw new ForbiddenError(
      "SUBSCRIPTION_EXPIRED",
      `Your ${planName} subscription has expired. Please renew to continue.`,
    );
  if (status === "CANCELLED")
    throw new ForbiddenError(
      "SUBSCRIPTION_CANCELLED",
      "Your subscription has been cancelled. Please contact support.",
    );
}

export async function assertSpaceLimit(businessId: number) {
  const sub = await getSubscriptionWithPlan(businessId);
  assertStatusActive(sub.status, sub.plan.name);
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
  assertStatusActive(sub.status, sub.plan.name);
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
  assertStatusActive(sub.status, sub.plan.name);
  const features = sub.plan.features as unknown as PlanFeatures;
  if (!features[feature])
    throw new ForbiddenError(
      "FEATURE_NOT_AVAILABLE",
      `This feature requires a higher plan. Upgrade to unlock it.`,
    );
}

export async function getAnalyticsCutoffDate(
  businessId: number,
): Promise<Date | null> {
  const sub = await getSubscriptionWithPlan(businessId);
  if (sub.plan.analyticsDays === null) return null; // unlimited
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - sub.plan.analyticsDays);
  return cutoff;
}
