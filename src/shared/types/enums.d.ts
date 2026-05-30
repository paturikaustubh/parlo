export type UserRole = "USER" | "STAFF" | "OWNER" | "VERIFIER";
export type VehicleType =
  | "TWO_WHEELER"
  | "THREE_WHEELER"
  | "FOUR_WHEELER"
  | "HEAVY";
export type BusinessStatus = "PENDING" | "ACTIVE" | "SUSPENDED";
export type RegistrationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REVISION_REQUESTED";
export type StaffStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "REMOVED";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type SessionStatus =
  | "ACTIVE"
  | "CHECKOUT_REQUESTED"
  | "COMPLETED"
  | "CANCELLED";
export type CheckoutStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export type SubscriptionStatus =
  | "DEMO"
  | "ACTIVE"
  | "GRACE"
  | "EXPIRED"
  | "CANCELLED";
export type BillingCycle = "MONTHLY" | "YEARLY" | "DEMO";
export type SubscriptionRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface LookupValue {
  code: string;
  displayName: string;
}
