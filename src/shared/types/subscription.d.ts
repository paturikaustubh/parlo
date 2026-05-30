import type {
  SubscriptionStatus,
  BillingCycle,
  SubscriptionRequestStatus,
} from "./enums";

export type PlanSlug = "demo" | "starter" | "growth" | "pro" | "enterprise";

export interface PlanFeatures {
  dutyTracking: boolean;
  staffPerformance: boolean;
  amountOverride: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  id: string;
  name: string;
  slug: PlanSlug;
  priceMonthlyPaise: number | null;
  priceYearlyPaise: number | null;
  maxSpaces: number | null;
  maxStaff: number | null;
  analyticsDays: number | null;
  features: PlanFeatures;
  isActive: boolean;
}

export interface BusinessSubscription {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startsAt: string;
  expiresAt: string;
  graceExpiresAt: string | null;
  activatedBy: string | null;
  activatedAt: string | null;
  notes: string | null;
}

export interface SubscriptionRequest {
  id: string;
  businessId: string;
  planId: string;
  requestedBy: string;
  billingCycle: BillingCycle;
  status: SubscriptionRequestStatus;
  notes: string | null;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface BusinessSubscriptionDetail {
  subscription: BusinessSubscription;
  plan: Plan;
  usage: { spacesUsed: number; staffUsed: number };
}

export interface CreateSubscriptionRequestBody {
  planId: string;
  billingCycle: BillingCycle;
  notes?: string;
}
