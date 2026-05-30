import { describe, it, expect } from "vitest";
import { formatSpace } from "./space.repository";

const baseSpace = {
  spaceId: "space-uuid-1",
  businessId: 1,
  name: "Main Lot",
  address: "123 Main St",
  latitude: null,
  longitude: null,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  business: { businessId: "biz-uuid-1" },
};

describe("formatSpace", () => {
  it("maps spaceType when present", () => {
    const result = formatSpace({ ...baseSpace, spaceType: "Mall Parking" });
    expect(result.spaceType).toBe("Mall Parking");
  });

  it("maps null spaceType", () => {
    const result = formatSpace({ ...baseSpace, spaceType: null });
    expect(result.spaceType).toBeNull();
  });
});
