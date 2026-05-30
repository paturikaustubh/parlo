import { prisma } from "@/lib/db";
import { describe, it, expect, vi } from "vitest";

describe("getUserAnalytics spendingTrend", () => {
  it("should calculate total spending per month correctly", async () => {
    const userId = 1;

    // Mock dates for different months
    const dateJan = new Date("2026-01-15T10:00:00Z");
    const dateFeb = new Date("2026-02-10T10:00:00Z");

    // Create mock sessions for the user
    // January: 2 sessions, 1000 + 2000 = 3000 paise
    // February: 1 session, 5000 paise
    const mockSessions = [
      {
        userId,
        status: "COMPLETED",
        amountPaise: 1000,
        checkedInAt: dateJan,
        durationMinutes: 60,
        vehicleType: "CAR",
        space: { spaceId: "S1", name: "Space 1" },
      },
      {
        userId,
        status: "COMPLETED",
        amountPaise: 2000,
        checkedInAt: dateJan,
        durationMinutes: 60,
        vehicleType: "CAR",
        space: { spaceId: "S1", name: "Space 1" },
      },
      {
        userId,
        status: "COMPLETED",
        amountPaise: 5000,
        checkedInAt: dateFeb,
        durationMinutes: 60,
        vehicleType: "CAR",
        space: { spaceId: "S1", name: "Space 1" },
      },
    ];

    // Mock prisma.parkingSession.findMany
    vi.spyOn(prisma.parkingSession, "findMany").mockResolvedValue(
      mockSessions as any,
    );

    const result = await getUserAnalytics(userId);

    expect(result.spendingTrend).toEqual([
      { month: "2026-01", amount: 3000 },
      { month: "2026-02", amount: 5000 },
    ]);
  });

  it("should return empty array for user with no spending", async () => {
    vi.spyOn(prisma.parkingSession, "findMany").mockResolvedValue([]);
    const result = await getUserAnalytics(999);
    expect(result.spendingTrend).toEqual([]);
  });
});
