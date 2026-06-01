import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    business: { findFirst: vi.fn() },
    businessSubscription: { findUnique: vi.fn() },
    staffMember: { update: vi.fn() },
    space: { findUnique: vi.fn() },
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
    userId: 99,
  }),
  formatStaff: vi.fn((s) => s),
}));
vi.mock("@/services/auth.service", () => ({
  invalidateUserSessions: vi.fn().mockResolvedValue(undefined),
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

describe("PATCH /api/v1/owner/staff/[staffId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when subscription is expired", async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue({
      id: 5,
    } as any);
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue(
      expiredSub as any,
    );

    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/v1/owner/staff/staff-uuid", {
      method: "PATCH",
      body: JSON.stringify({ status: "INACTIVE" }),
    });
    const ctx = { params: Promise.resolve({ staffId: "staff-uuid" }) };
    const res = await PATCH(req as any, ctx as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SUBSCRIPTION_EXPIRED");
  });
});

describe("DELETE /api/v1/owner/staff/[staffId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when subscription is expired", async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue({
      id: 5,
    } as any);
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue(
      expiredSub as any,
    );

    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/v1/owner/staff/staff-uuid", {
      method: "DELETE",
    });
    const ctx = { params: Promise.resolve({ staffId: "staff-uuid" }) };
    const res = await DELETE(req as any, ctx as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SUBSCRIPTION_EXPIRED");
  });
});
