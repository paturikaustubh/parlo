import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    businessRegistration: { create: vi.fn(), findFirst: vi.fn() },
    plan: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/errors", () => ({
  NotFoundError: class NotFoundError extends Error {},
  ConflictError: class ConflictError extends Error {},
  ValidationError: class ValidationError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock("@/repositories/business.repository", () => ({
  formatBusiness: vi.fn((x) => x),
  formatRegistration: vi.fn((x) => x),
}));

const mockReg = (overrides = {}) => ({
  id: 1,
  businessRegistrationId: "reg-1",
  businessName: "Test",
  spaceType: "Garage",
  spaceName: "Main",
  spaceAddress: "123 St",
  licenseNumber: null,
  gstNumber: null,
  documentUrls: {},
  submittedBy: 1,
  status: "PENDING",
  notes: null,
  reviewNotes: null,
  reviewedBy: null,
  reviewedAt: null,
  resultBusinessId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  planId: 1,
  billingCycle: "MONTHLY",
  paymentProofUrl: null,
  linkId: null,
  submitter: null,
  plan: null,
  ...overrides,
});

describe("submitRegistration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves spaceType to business_registrations", async () => {
    const { submitRegistration } = await import("./business.service");
    vi.mocked(prisma.businessRegistration.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.businessRegistration.create).mockResolvedValue(
      mockReg() as any,
    );

    await submitRegistration(1, {
      businessName: "Test",
      spaceType: "Garage",
      spaceName: "Main",
      spaceAddress: "123 St",
      documentUrls: { pan: "https://example.com/pan.pdf" },
      planId: 1,
      billingCycle: "MONTHLY",
    });

    expect(prisma.businessRegistration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ spaceType: "Garage" }),
      }),
    );
  });

  it("saves null when spaceType omitted", async () => {
    const { submitRegistration } = await import("./business.service");
    vi.mocked(prisma.businessRegistration.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.businessRegistration.create).mockResolvedValue(
      mockReg({ spaceType: null }) as any,
    );

    await submitRegistration(1, {
      businessName: "Test",
      spaceName: "Main",
      spaceAddress: "123 St",
      documentUrls: { pan: "https://example.com/pan.pdf" },
      planId: 1,
      billingCycle: "MONTHLY",
    });

    expect(prisma.businessRegistration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ spaceType: null }),
      }),
    );
  });
});
