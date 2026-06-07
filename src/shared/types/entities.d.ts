import type {
  UserRole,
  VehicleType,
  BusinessStatus,
  RegistrationStatus,
  StaffStatus,
  InvitationStatus,
  SessionStatus,
  CheckoutStatus,
} from "./enums";

export interface User {
  userId: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserRoleEntry {
  userRoleId: string;
  role: UserRole;
  businessId: string | null;
  isActive: boolean;
}

export interface Vehicle {
  vehicleId: string;
  userId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  nickname: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Business {
  businessId: string;
  name: string;
  ownerId: string;
  status: BusinessStatus;
  isDemo: boolean;
  createdAt: string;
}

export interface Space {
  spaceId: string;
  businessId: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  spaceType: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PricingRule {
  pricingRuleId: string;
  spaceId: string;
  vehicleType: VehicleType;
  durationFromMinutes: number;
  durationToMinutes: number | null;
  amountPaise: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  staffMemberId: string;
  userId: string;
  user: Pick<User, "userId" | "name" | "phone">;
  businessId: string;
  spaceId: string | null;
  status: StaffStatus;
  isOnDuty: boolean;
  dutyStartedAt: string | null;
  createdAt: string;
}

export interface StaffInvitation {
  staffInvitationId: string;
  businessId: string;
  phone: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface ParkingSession {
  parkingSessionId: string;
  spaceId: string;
  space: Pick<Space, "spaceId" | "name">;
  vehicleId: string | null;
  vehicleNickname?: string | null;
  vehicleNumber: string;
  vehicleType: VehicleType;
  guestName: string | null;
  guestPhone: string | null;
  tokenId: string | null;
  isOnBehalf: boolean;
  userId: string | null;
  status: SessionStatus;
  checkedInAt: string;
  checkedOutAt: string | null;
  durationMinutes: number | null;
  amountPaise: number | null;
  overrideAmountPaise: number | null;
  overrideReason: string | null;
  checkedInByStaffId: string | null;
  checkedOutByStaffId: string | null;
  checkedInByName: string | null;
  checkedOutByName: string | null;
  userName: string | null;
  userPhone: string | null;
  checkedInByPhone: string | null;
  checkedOutByPhone: string | null;
  requestCode: string | null;
  createdAt: string;
}

export interface CheckoutRequest {
  checkoutRequestId: string;
  requestCode: string;
  spaceId: string;
  userId: string | null;
  userName: string | null;
  userPhone: string | null;
  status: CheckoutStatus;
  combinedAmountPaise: number;
  expiresAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  approverName: string | null;
  approverPhone: string | null;
  rejectionReason: string | null;
  sessions: Array<
    Pick<
      ParkingSession,
      | "parkingSessionId"
      | "vehicleNumber"
      | "vehicleType"
      | "checkedInAt"
      | "checkedOutAt"
      | "amountPaise"
    >
  >;
  createdAt: string;
}

export interface ActionSession {
  id: string;
  spaceId: string;
  spaceName: string;
  businessName: string;
  supportedVehicleTypes: string[];
  expiresAt: string;
}

export interface BusinessRegistration {
  businessRegistrationId: string;
  businessId: string | null;
  submittedBy: string | null;
  submittedByUser: Pick<User, "userId" | "name" | "phone"> | null;
  businessName: string;
  spaceType: string | null;
  spaceName: string;
  spaceAddress: string;
  licenseNumber: string | null;
  gstNumber: string | null;
  documentUrls: Record<string, string>;
  status: RegistrationStatus;
  notes: string | null;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  linkId?: string | null;
  billingCycle?: string | null;
  paymentProofUrl?: string | null;
  plan?: { planId: string; name: string; slug: string } | null;
}

export interface Notification {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  auditId: string;
  businessId: string;
  spaceId: string | null;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
