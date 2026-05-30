import type {
  User,
  Vehicle,
  ParkingSession,
  CheckoutRequest,
  Business,
  Space,
  StaffMember,
  PricingRule,
  BusinessRegistration,
  ActionSession,
  Notification,
  UserRoleEntry,
} from "./entities";
import type { VehicleType, CheckoutStatus, StaffStatus } from "./enums";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RequestOtpBody {
  phone: string;
}
export interface RequestOtpResponse {
  message: string;
  expiresInSeconds: number;
}
export interface VerifyOtpBody {
  phone: string;
  otp: string;
}
export interface VerifyOtpResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}
export interface SignInWithPasswordBody {
  phone: string;
  password: string;
}
export interface SignInWithPasswordResponse {
  token: string;
  user: User;
}
export interface SignUpBody {
  phone: string;
  name: string;
  password: string;
}
export interface SignUpResponse {
  token: string;
  user: User;
}
export interface SetPasswordBody {
  currentPassword?: string;
  newPassword: string;
}

export interface UpdateUserBody {
  name?: string;
}
export type GetMeResponse = User & { roles: UserRoleEntry[] };

export interface CreateVehicleBody {
  vehicleType: VehicleType;
  vehicleNumber: string;
  nickname?: string;
}
export interface UpdateVehicleBody {
  vehicleType?: VehicleType;
  vehicleNumber?: string;
  nickname?: string;
}

export interface ValidateQrBody {
  uuid: string;
}
export type ValidateQrResponse = ActionSession & {
  spaceName: string;
  businessName: string;
};

export interface CheckInBody {
  actionSessionId: string;
  vehicleId?: string;
  guestName?: string;
  guestPhone?: string;
  guestVehicleType?: VehicleType;
  guestVehicleNumber?: string;
  createdByStaff?: boolean;
  spaceId?: string;
}
export type CheckInResponse = ParkingSession;

export interface OnBehalfCheckInBody {
  spaceId: string;
  name: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
}
export interface OnBehalfCheckInResponse {
  session: ParkingSession;
  tokenId: string;
}

export interface CreateCheckoutRequestBody {
  sessionIds: string[];
}
export type CreateCheckoutRequestResponse = CheckoutRequest;

export interface UpdateCheckoutRequestBody {
  status: CheckoutStatus;
  reason?: string;
  finalAmount?: number;
  overrideReason?: string;
}

export interface UpdateDutyStatusBody {
  isOnDuty: boolean;
}
export type TokenLookupResponse = ParkingSession & {
  durationMinutes: number;
  calculatedAmountPaise: number;
};

export interface CreateStaffRequestBody {
  businessId: string;
  notes?: string;
}
export interface UpdateStaffRequestBody {
  status: StaffStatus;
  reviewNotes?: string;
}
export interface InviteStaffBody {
  phone: string;
  spaceId?: string;
}

export interface CreateSpaceBody {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}
export interface UpdateSpaceBody {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}
export interface UpdatePricingBody {
  rules: Array<Omit<PricingRule, "pricingRuleId" | "spaceId">>;
}

export interface RegisterBusinessBody {
  businessName: string;
  spaceType?: string;
  spaceName: string;
  spaceAddress: string;
  licenseNumber?: string;
  gstNumber?: string;
  documentUrls: Record<string, string>;
}

export interface AnalyticsQuery {
  from?: string;
  to?: string;
  spaceId?: string;
}
