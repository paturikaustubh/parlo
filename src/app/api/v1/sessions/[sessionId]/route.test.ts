import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    staffMember: { findFirst: vi.fn() },
    parkingSession: { findUnique: vi.fn() },
    businessSubscription: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 1, roles: ["STAFF"] }),
}));
vi.mock("@/services/session.service", () => ({
  getSession: vi.fn(),
  closeSession: vi.fn().mockResolvedValue({ sessionId: "s1" }),
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

describe("PATCH /api/v1/sessions/[sessionId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when subscription is expired", async () => {
    vi.mocked(prisma.staffMember.findFirst).mockResolvedValue({
      id: 10,
    } as any);
    vi.mocked(prisma.parkingSession.findUnique).mockResolvedValue({
      space: { businessId: 5 },
    } as any);
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue(
      expiredSub as any,
    );

    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/v1/sessions/abc", {
      method: "PATCH",
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    const ctx = { params: Promise.resolve({ sessionId: "abc" }) };
    const res = await PATCH(req as any, ctx as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SUBSCRIPTION_EXPIRED");
  });
});
