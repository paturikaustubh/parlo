import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    parkingSession: { findFirst: vi.fn() },
    businessSubscription: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 1, roles: ["STAFF"] }),
}));
vi.mock("@/services/checkout.service", () => ({
  createCheckoutRequest: vi.fn().mockResolvedValue({ requestId: "r1" }),
}));
vi.mock("@/repositories/checkout.repository", () => ({
  formatCheckoutRequest: vi.fn((r) => r),
  listCheckoutRequests: vi.fn().mockResolvedValue({ requests: [], total: 0 }),
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

describe("POST /api/v1/checkout/requests", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when subscription is expired", async () => {
    vi.mocked(prisma.parkingSession.findFirst).mockResolvedValue({
      space: { businessId: 5 },
    } as any);
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue(
      expiredSub as any,
    );

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/v1/checkout/requests", {
      method: "POST",
      body: JSON.stringify({ sessionIds: ["session-uuid-1"] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SUBSCRIPTION_EXPIRED");
  });
});
