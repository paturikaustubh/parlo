import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    space: { findUnique: vi.fn() },
    staffMember: { findFirst: vi.fn() },
    businessSubscription: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn().mockResolvedValue({ userId: 1, roles: ["OWNER"] }),
}));
vi.mock("@/services/qr.service", () => ({
  getOrRotateQr: vi.fn().mockResolvedValue({ token: "abc" }),
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

describe("GET /api/v1/spaces/[spaceId]/qr", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when subscription is expired", async () => {
    vi.mocked(prisma.space.findUnique).mockResolvedValue({
      id: 1,
      spaceId: "space-uuid",
      businessId: 5,
    } as any);
    vi.mocked(prisma.businessSubscription.findUnique).mockResolvedValue(
      expiredSub as any,
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/v1/spaces/space-uuid/qr");
    const ctx = { params: Promise.resolve({ spaceId: "space-uuid" }) };
    const res = await GET(req as any, ctx as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SUBSCRIPTION_EXPIRED");
  });
});
