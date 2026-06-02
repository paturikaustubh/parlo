import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    businessSubscription: { findUnique: vi.fn() },
  },
}));

const mockPlan = {
  name: "Demo",
  maxSpaces: 1,
  maxStaff: 1,
  features: {},
  analyticsDays: 7,
};

describe("assertBusinessSubscriptionActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes when DEMO subscription is not yet expired", async () => {
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue({
      status: "DEMO",
      expiresAt: new Date(Date.now() + 86_400_000),
      graceExpiresAt: null,
      plan: mockPlan,
    } as any);

    const { assertBusinessSubscriptionActive } =
      await import("@/lib/subscription-limits");
    await expect(assertBusinessSubscriptionActive(1)).resolves.toBeUndefined();
  });

  it("throws ForbiddenError when DEMO subscription is expired", async () => {
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue({
      status: "DEMO",
      expiresAt: new Date(Date.now() - 1000),
      graceExpiresAt: null,
      plan: mockPlan,
    } as any);

    const { assertBusinessSubscriptionActive } =
      await import("@/lib/subscription-limits");
    await expect(assertBusinessSubscriptionActive(1)).rejects.toMatchObject({
      code: "SUBSCRIPTION_EXPIRED",
    });
  });

  it("throws ForbiddenError when status is EXPIRED", async () => {
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue({
      status: "EXPIRED",
      expiresAt: new Date(Date.now() - 1000),
      graceExpiresAt: null,
      plan: mockPlan,
    } as any);

    const { assertBusinessSubscriptionActive } =
      await import("@/lib/subscription-limits");
    await expect(assertBusinessSubscriptionActive(1)).rejects.toMatchObject({
      code: "SUBSCRIPTION_EXPIRED",
    });
  });

  it("throws ForbiddenError when status is CANCELLED", async () => {
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue({
      status: "CANCELLED",
      expiresAt: new Date(Date.now() - 1000),
      graceExpiresAt: null,
      plan: mockPlan,
    } as any);

    const { assertBusinessSubscriptionActive } =
      await import("@/lib/subscription-limits");
    await expect(assertBusinessSubscriptionActive(1)).rejects.toMatchObject({
      code: "SUBSCRIPTION_CANCELLED",
    });
  });

  it("throws ForbiddenError when GRACE period is also expired", async () => {
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue({
      status: "GRACE",
      expiresAt: new Date(Date.now() - 86_400_000),
      graceExpiresAt: new Date(Date.now() - 1000),
      plan: mockPlan,
    } as any);

    const { assertBusinessSubscriptionActive } =
      await import("@/lib/subscription-limits");
    await expect(assertBusinessSubscriptionActive(1)).rejects.toMatchObject({
      code: "SUBSCRIPTION_EXPIRED",
    });
  });

  it("throws ForbiddenError when no subscription exists", async () => {
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue(null);

    const { assertBusinessSubscriptionActive } =
      await import("@/lib/subscription-limits");
    await expect(assertBusinessSubscriptionActive(1)).rejects.toMatchObject({
      code: "NO_SUBSCRIPTION",
    });
  });
});

describe("getOwnerAnalyticsConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns cutoffDate = 30 days ago and staffPerformance=true for growth plan", async () => {
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue({
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86_400_000),
      graceExpiresAt: null,
      plan: {
        name: "Growth",
        maxSpaces: 3,
        maxStaff: 10,
        analyticsDays: 30,
        features: {
          staffPerformance: true,
          dutyTracking: true,
          amountOverride: true,
          prioritySupport: false,
        },
      },
    } as any);

    const { getOwnerAnalyticsConfig } =
      await import("@/lib/subscription-limits");
    const { cutoffDate, staffPerformanceEnabled } =
      await getOwnerAnalyticsConfig(1);

    expect(staffPerformanceEnabled).toBe(true);
    expect(cutoffDate).not.toBeNull();
    const diffDays =
      (Date.now() - cutoffDate!.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29.9);
    expect(diffDays).toBeLessThanOrEqual(30.1);
  });

  it("returns cutoffDate=null and staffPerformance=false for starter plan", async () => {
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue({
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86_400_000),
      graceExpiresAt: null,
      plan: {
        name: "Starter",
        maxSpaces: 1,
        maxStaff: 3,
        analyticsDays: 30,
        features: {
          staffPerformance: false,
          dutyTracking: true,
          amountOverride: false,
          prioritySupport: false,
        },
      },
    } as any);

    const { getOwnerAnalyticsConfig } =
      await import("@/lib/subscription-limits");
    const { cutoffDate, staffPerformanceEnabled } =
      await getOwnerAnalyticsConfig(1);

    expect(staffPerformanceEnabled).toBe(false);
    expect(cutoffDate).not.toBeNull(); // 30-day cutoff still applies
  });

  it("returns null cutoffDate for plan with unlimited analytics", async () => {
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue({
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86_400_000),
      graceExpiresAt: null,
      plan: {
        name: "Pro",
        maxSpaces: null,
        maxStaff: null,
        analyticsDays: null,
        features: {
          staffPerformance: true,
          dutyTracking: true,
          amountOverride: true,
          prioritySupport: true,
        },
      },
    } as any);

    const { getOwnerAnalyticsConfig } =
      await import("@/lib/subscription-limits");
    const { cutoffDate, staffPerformanceEnabled } =
      await getOwnerAnalyticsConfig(1);

    expect(cutoffDate).toBeNull();
    expect(staffPerformanceEnabled).toBe(true);
  });
});
