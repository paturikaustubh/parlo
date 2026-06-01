import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    staffMember: { findFirst: vi.fn() },
    business: { findFirst: vi.fn() },
    space: { findUnique: vi.fn() },
    businessSubscription: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 1, roles: ["OWNER"] }),
}));
vi.mock("@/services/checkout.service", () => ({
  getSingleCheckoutRequest: vi.fn().mockResolvedValue({}),
  updateCheckoutRequest: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/repositories/checkout.repository", () => ({
  findCheckoutRequestById: vi
    .fn()
    .mockResolvedValue({ spaceId: 10, userId: 99 }),
  formatCheckoutRequest: vi.fn((r) => r),
}));

const expiredSub = {
  status: "DEMO",
  expiresAt: new Date(Date.now() - 1000),
  graceExpiresAt: null,
  plan: {
    name: "Demo",
    maxSpaces: 1,
    maxStaff: 1,
    features: {},
    analyticsDays: 7,
  },
};

describe("PATCH /api/v1/checkout/requests/[requestId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when subscription is expired", async () => {
    vi.mocked(prisma.staffMember.findFirst).mockResolvedValue(null);
    vi.mocked((prisma as any).business.findFirst).mockResolvedValue({ id: 5 });
    vi.mocked(prisma.space.findUnique).mockResolvedValue({
      businessId: 5,
    } as any);
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue(
      expiredSub as any,
    );

    const { PATCH } = await import("./route");
    const req = new Request(
      "http://localhost/api/v1/checkout/requests/req-uuid",
      {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED" }),
      },
    );
    const ctx = { params: Promise.resolve({ requestId: "req-uuid" }) };
    const res = await PATCH(req as any, ctx as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SUBSCRIPTION_EXPIRED");
  });
});
