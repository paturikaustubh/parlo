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
