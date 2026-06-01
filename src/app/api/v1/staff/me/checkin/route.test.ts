import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    staffMember: { findFirst: vi.fn() },
    businessSubscription: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn().mockResolvedValue({ userId: 1, roles: ["STAFF"] }),
}));
vi.mock("@/services/staff.service", () => ({
  checkInOnBehalf: vi.fn().mockResolvedValue({ sessionId: "s1" }),
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

describe("POST /api/v1/staff/me/checkin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when subscription is expired", async () => {
    vi.mocked(prisma.staffMember.findFirst).mockResolvedValue({
      businessId: 5,
    } as any);
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue(
      expiredSub as any,
    );

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/v1/staff/me/checkin", {
      method: "POST",
      body: JSON.stringify({
        vehicleNumber: "KA01AB1234",
        vehicleType: "FOUR_WHEELER",
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SUBSCRIPTION_EXPIRED");
  });
});
