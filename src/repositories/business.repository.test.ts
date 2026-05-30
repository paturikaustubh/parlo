import { describe, it, expect } from "vitest";
import { formatRegistration } from "./business.repository";

const base = {
  businessRegistrationId: "reg-uuid-1",
  businessName: "Test Biz",
  spaceName: "Main Lot",
  spaceAddress: "123 Main St",
  licenseNumber: null,
  gstNumber: null,
  documentUrls: {},
  submittedBy: null,
  status: "PENDING",
  notes: null,
  reviewNotes: null,
  reviewedBy: null,
  reviewedAt: null,
  resultBusinessId: null,
  createdAt: new Date("2026-01-01"),
  submitter: null,
};

describe("formatRegistration", () => {
  it("maps spaceType field", () => {
    const result = formatRegistration({ ...base, spaceType: "Parking Lot" });
    expect(result.spaceType).toBe("Parking Lot");
  });

  it("maps null spaceType", () => {
    const result = formatRegistration({ ...base, spaceType: null });
    expect(result.spaceType).toBeNull();
  });

  it("does not expose category key", () => {
    const result = formatRegistration({ ...base, spaceType: null }) as Record<
      string,
      unknown
    >;
    expect(result.category).toBeUndefined();
  });
});
