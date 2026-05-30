import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    businessRegistration: { findUnique: vi.fn(), update: vi.fn() },
    role: { findUnique: vi.fn() },
    plan: { findUnique: vi.fn() },
    business: { create: vi.fn() },
    userRole: { upsert: vi.fn() },
    staffMember: { upsert: vi.fn() },
    subscriptionRequest: { create: vi.fn() },
  },
}));

vi.mock("@/repositories/business.repository", () => ({
  formatRegistration: vi.fn((r) => r),
}));

const mockRole = { id: 10, code: "OWNER" };
const mockDemoPlan = { id: 1, slug: "demo" };
const mockPaidPlan = { id: 2, slug: "starter", name: "Starter" };
const mockBusiness = {
  id: 99,
  businessId: "biz-uuid",
  owner: { userId: "owner-uuid" },
};

const baseReg = {
  id: 1,
  businessRegistrationId: "reg-uuid",
  businessName: "Test Biz",
  submittedBy: 42,
  planId: null,
  billingCycle: "DEMO",
  paymentProofUrl: null,
  spaceName: "Main Lot",
  spaceAddress: "123 St",
  spaceType: "Parking Lot",
  status: "PENDING",
  linkId: null,
};

describe("approveRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as any);
    vi.mocked(prisma.business.create).mockResolvedValue(mockBusiness as any);
    vi.mocked(prisma.userRole.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.staffMember.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.businessRegistration.update).mockResolvedValue({} as any);
    vi.mocked(prisma.businessRegistration.findUnique)
      .mockResolvedValueOnce(baseReg as any)
      .mockResolvedValue({ ...baseReg, status: "APPROVED" } as any);
  });

  it("creates demo subscription when billingCycle is DEMO", async () => {
    const { approveRegistration } = await import("./business.service");
    vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockDemoPlan as any);

    await approveRegistration("reg-uuid", 1, { status: "APPROVED" });

    const createCall = vi.mocked(prisma.business.create).mock
      .calls[0][0] as any;
    expect(createCall.data.isDemo).toBe(true);
    expect(createCall.data.subscription.create.status).toBe("DEMO");
    expect(createCall.data.subscription.create.billingCycle).toBe("DEMO");
    expect(createCall.data.subscription.create.planId).toBe(mockDemoPlan.id);
    expect(prisma.subscriptionRequest.create).not.toHaveBeenCalled();
  });

  it("creates paid MONTHLY subscription when paid plan selected", async () => {
    const { approveRegistration } = await import("./business.service");
    const paidReg = {
      ...baseReg,
      planId: 2,
      billingCycle: "MONTHLY",
      paymentProofUrl: "https://example.com/proof.jpg",
    };
    vi.mocked(prisma.businessRegistration.findUnique)
      .mockReset()
      .mockResolvedValueOnce(paidReg as any)
      .mockResolvedValue({ ...paidReg, status: "APPROVED" } as any);
    vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPaidPlan as any);

    const before = Date.now();
    await approveRegistration("reg-uuid", 1, { status: "APPROVED" });

    const createCall = vi.mocked(prisma.business.create).mock
      .calls[0][0] as any;
    expect(createCall.data.isDemo).toBe(false);
    expect(createCall.data.subscription.create.status).toBe("ACTIVE");
    expect(createCall.data.subscription.create.billingCycle).toBe("MONTHLY");
    expect(createCall.data.subscription.create.planId).toBe(mockPaidPlan.id);

    const expiresAt: Date = createCall.data.subscription.create.expiresAt;
    const diffDays = (expiresAt.getTime() - before) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29.9);
    expect(diffDays).toBeLessThanOrEqual(30.1);

    expect(prisma.subscriptionRequest.create).not.toHaveBeenCalled();
  });

  it("creates paid YEARLY subscription with 365-day expiry", async () => {
    const { approveRegistration } = await import("./business.service");
    const paidReg = {
      ...baseReg,
      planId: 2,
      billingCycle: "YEARLY",
      paymentProofUrl: "https://example.com/proof.jpg",
    };
    vi.mocked(prisma.businessRegistration.findUnique)
      .mockReset()
      .mockResolvedValueOnce(paidReg as any)
      .mockResolvedValue({ ...paidReg, status: "APPROVED" } as any);
    vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPaidPlan as any);

    const before = Date.now();
    await approveRegistration("reg-uuid", 1, { status: "APPROVED" });

    const createCall = vi.mocked(prisma.business.create).mock
      .calls[0][0] as any;
    const expiresAt: Date = createCall.data.subscription.create.expiresAt;
    const diffDays = (expiresAt.getTime() - before) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(364.9);
    expect(diffDays).toBeLessThanOrEqual(365.1);
  });

  it("throws ValidationError when paid plan has no payment proof", async () => {
    const { approveRegistration } = await import("./business.service");
    const noProofReg = {
      ...baseReg,
      planId: 2,
      billingCycle: "MONTHLY",
      paymentProofUrl: null,
    };
    vi.mocked(prisma.businessRegistration.findUnique)
      .mockReset()
      .mockResolvedValueOnce(noProofReg as any);

    await expect(
      approveRegistration("reg-uuid", 1, { status: "APPROVED" }),
    ).rejects.toThrow();

    expect(prisma.business.create).not.toHaveBeenCalled();
  });
});
