import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    space: { findUnique: vi.fn(), delete: vi.fn() },
    parkingSession: { count: vi.fn() },
  },
}));

vi.mock("@/lib/errors", () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(_code: string, message: string) {
      super(message);
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    constructor(_code: string, message: string) {
      super(message);
    }
  },
  ConflictError: class ConflictError extends Error {
    constructor(_code: string, message: string) {
      super(message);
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(_code: string, message: string) {
      super(message);
    }
  },
}));

vi.mock("@/lib/subscription-limits", () => ({
  assertSpaceLimit: vi.fn(),
}));

vi.mock("@/repositories/space.repository", () => ({
  formatSpace: vi.fn((x: unknown) => x),
  formatPricingRule: vi.fn((x: unknown) => x),
}));

const mockSpace = (overrides = {}) => ({
  id: 1,
  spaceId: "space-uuid-1",
  business: { ownerId: 42 },
  ...overrides,
});

describe("deleteSpace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes space when owner and no active sessions", async () => {
    const { deleteSpace } = await import("./space.service");
    vi.mocked(prisma.space.findUnique).mockResolvedValue(mockSpace() as any);
    vi.mocked(prisma.parkingSession.count).mockResolvedValue(0);
    vi.mocked(prisma.space.delete).mockResolvedValue({} as any);

    await deleteSpace("space-uuid-1", 42);

    expect(prisma.space.delete).toHaveBeenCalledWith({
      where: { spaceId: "space-uuid-1" },
    });
  });

  it("throws NotFoundError when space not found", async () => {
    const { deleteSpace } = await import("./space.service");
    vi.mocked(prisma.space.findUnique).mockResolvedValue(null);

    await expect(deleteSpace("bad-id", 42)).rejects.toThrow("Space not found");
  });

  it("throws ForbiddenError when wrong owner", async () => {
    const { deleteSpace } = await import("./space.service");
    vi.mocked(prisma.space.findUnique).mockResolvedValue(mockSpace() as any);

    await expect(deleteSpace("space-uuid-1", 99)).rejects.toThrow(
      "Not your space",
    );
  });

  it("throws ConflictError when active sessions exist", async () => {
    const { deleteSpace } = await import("./space.service");
    vi.mocked(prisma.space.findUnique).mockResolvedValue(mockSpace() as any);
    vi.mocked(prisma.parkingSession.count).mockResolvedValue(2);

    await expect(deleteSpace("space-uuid-1", 42)).rejects.toThrow(
      "Space has active parking sessions",
    );
  });
});
