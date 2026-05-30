import { prisma } from "@/lib/db";
import type { Business, BusinessRegistration } from "@/shared/types";

export function formatBusiness(b: {
  businessId: string;
  name: string;
  ownerId: number;
  status: string;
  isDemo: boolean;
  createdAt: Date;
  owner: { userId: string };
}): Business {
  return {
    businessId: b.businessId,
    name: b.name,
    ownerId: b.owner.userId,
    status: b.status as Business["status"],
    isDemo: b.isDemo,
    createdAt: b.createdAt.toISOString(),
  };
}

export function formatRegistration(r: {
  businessRegistrationId: string;
  businessName: string;
  spaceType: string | null;
  spaceName: string;
  spaceAddress: string;
  licenseNumber: string | null;
  gstNumber: string | null;
  documentUrls: unknown;
  submittedBy: number | null;
  status: string;
  notes: string | null;
  reviewNotes: string | null;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  resultBusinessId: number | null;
  createdAt: Date;
  submitter: { userId: string; name: string; phone: string } | null;
  linkId?: string | null;
  billingCycle?: string | null;
  paymentProofUrl?: string | null;
  plan?: { planId: string; name: string; slug: string } | null;
}): BusinessRegistration {
  return {
    businessRegistrationId: r.businessRegistrationId,
    businessId: r.resultBusinessId?.toString() ?? null,
    submittedBy: r.submitter?.userId ?? null,
    submittedByUser: r.submitter ?? null,
    businessName: r.businessName,
    spaceType: r.spaceType,
    spaceName: r.spaceName,
    spaceAddress: r.spaceAddress,
    licenseNumber: r.licenseNumber,
    gstNumber: r.gstNumber,
    documentUrls: (r.documentUrls as Record<string, string> | null) ?? {},
    status: r.status as BusinessRegistration["status"],
    notes: r.notes,
    reviewNotes: r.reviewNotes,
    reviewedBy: r.reviewedBy?.toString() ?? null,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    linkId: r.linkId ?? null,
    billingCycle: r.billingCycle ?? null,
    paymentProofUrl: r.paymentProofUrl ?? null,
    plan: r.plan ?? null,
  };
}
