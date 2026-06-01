import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    business: { findFirst: vi.fn() },
    businessSubscription: { findUnique: vi.fn() },
    staffFlag: { update: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn().mockResolvedValue({ userId: 1, roles: ["OWNER"] }),
}));
vi.mock("@/repositories/staff.repository", () => ({
  findStaffById: vi.fn().mockResolvedValue({
    id: 10,
    staffMemberId: "staff-uuid",
    businessId: 5,
  }),
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

describe("PATCH /api/v1/owner/staff/[staffId]/flags/[flagId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when subscription is expired", async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue({
      id: 5,
    } as any);
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue(
      expiredSub as any,
    );

    const { PATCH } = await import("./route");
    const req = new Request(
      "http://localhost/api/v1/owner/staff/staff-uuid/flags/flag-uuid",
      {
        method: "PATCH",
        body: JSON.stringify({ status: "RESOLVED" }),
      },
    );
    const ctx = {
      params: Promise.resolve({ staffId: "staff-uuid", flagId: "flag-uuid" }),
    };
    const res = await PATCH(req as any, ctx as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SUBSCRIPTION_EXPIRED");
  });
});
