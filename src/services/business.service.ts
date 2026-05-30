import { prisma } from "@/lib/db";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
} from "@/lib/errors";
import {
  formatBusiness,
  formatRegistration,
} from "@/repositories/business.repository";

/**
 * Validates document URLs object according to business requirements
 * - Must be a non-null object
 * - Must not be empty
 * - Each key must be either:
 *   - A predefined category code from document_categories table
 *   - A valid snake_case string (^[a-z][a-z0-9_]*$)
 * - Each value must be a valid URL string
 */
async function validateDocumentUrls(
  documentUrls: unknown,
  userId: number,
): Promise<Record<string, string>> {
  // Type check: must be an object
  if (
    documentUrls === null ||
    typeof documentUrls !== "object" ||
    Array.isArray(documentUrls)
  ) {
    throw new ValidationError({
      documentUrls: "Invalid format: must be an object with category keys",
    });
  }

  // Empty check
  const keys = Object.keys(documentUrls as Record<string, string>);
  if (keys.length === 0) {
    throw new ValidationError({
      documentUrls: "At least one document is required",
    });
  }

  // Validate each entry — category key must be valid snake_case
  const validatedUrls: Record<string, string> = {};
  for (const [category, url] of Object.entries(
    documentUrls as Record<string, string>,
  )) {
    // Value must be a non-empty string
    if (typeof url !== "string" || url.trim() === "") {
      throw new ValidationError({
        documentUrls: `Invalid URL for category '${category}'`,
      });
    }

    // Key must be snake_case (lowercase letters, digits, underscores, starts with letter)
    if (!/^[a-z][a-z0-9_]*$/.test(category)) {
      throw new ValidationError({
        documentUrls: `Category '${category}' must be snake_case (lowercase, alphanumeric + underscores)`,
      });
    }

    // Additional URL format validation (basic check)
    try {
      new URL(url);
    } catch {
      throw new ValidationError({
        documentUrls: `Invalid URL format for category '${category}'`,
      });
    }

    validatedUrls[category] = url.trim();
  }

  return validatedUrls;
}

export async function getMyBusiness(ownerId: number) {
  const business = await prisma.business.findFirst({
    where: { ownerId, deletedAt: null },
    include: { owner: { select: { userId: true } } },
  });
  if (!business)
    throw new NotFoundError(
      "BUSINESS_NOT_FOUND",
      "No business found for your account",
    );
  return formatBusiness(business);
}

export async function updateBusiness(
  businessId: string,
  ownerId: number,
  data: { name?: string },
) {
  const business = await prisma.business.findFirst({
    where: { businessId, ownerId, deletedAt: null },
    include: { owner: { select: { userId: true } } },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "Business not found");

  const updated = await prisma.business.update({
    where: { businessId },
    data,
    include: { owner: { select: { userId: true } } },
  });
  return formatBusiness(updated);
}

export async function submitRegistration(
  userId: number,
  data: {
    businessName: string;
    spaceType?: string;
    spaceName: string;
    spaceAddress: string;
    licenseNumber?: string;
    gstNumber?: string;
    documentUrls: Record<string, string>;
    planId: number;
    billingCycle: string;
    paymentProofUrl?: string;
    linkId?: string;
  },
) {
  const validatedDocumentUrls = await validateDocumentUrls(
    data.documentUrls,
    userId,
  );

  const pending = await prisma.businessRegistration.findFirst({
    where: {
      submittedBy: userId,
      status: { in: ["PENDING", "REVISION_REQUESTED"] },
    },
  });
  if (pending)
    throw new ConflictError(
      "REGISTRATION_ALREADY_SUBMITTED",
      "You already have a pending registration",
    );

  const reg = await prisma.businessRegistration.create({
    data: {
      businessName: data.businessName,
      spaceType: data.spaceType ?? null,
      spaceName: data.spaceName,
      spaceAddress: data.spaceAddress,
      licenseNumber: data.licenseNumber ?? null,
      gstNumber: data.gstNumber ?? null,
      documentUrls: validatedDocumentUrls,
      submittedBy: userId,
      planId: data.planId,
      billingCycle: data.billingCycle,
      paymentProofUrl: data.paymentProofUrl ?? null,
    },
    include: {
      submitter: { select: { userId: true, name: true, phone: true } },
    },
  });
  return formatRegistration(reg);
}

export async function approveRegistration(
  registrationId: string,
  reviewerId: number,
  data: { status: "APPROVED" | "REJECTED"; notes?: string },
) {
  const reg = await prisma.businessRegistration.findUnique({
    where: { businessRegistrationId: registrationId },
  });
  if (!reg) throw new NotFoundError("NOT_FOUND", "Registration not found");

  if (data.status === "APPROVED" && reg.submittedBy) {
    const ownerRole = await prisma.role.findUnique({
      where: { code: "OWNER" },
    });
    if (!ownerRole) throw new Error("OWNER role not seeded");

    const isPaidPlan =
      reg.planId != null &&
      reg.billingCycle != null &&
      reg.billingCycle !== "DEMO";

    if (isPaidPlan && !reg.paymentProofUrl) {
      throw new ValidationError({
        paymentProofUrl: "Payment proof required for paid plans",
      });
    }

    let subscriptionPlanId: number;
    let subscriptionStatus: string;
    let subscriptionBillingCycle: string;
    let subscriptionExpiresAt: Date;
    let isDemo: boolean;

    if (isPaidPlan) {
      const plan = await prisma.plan.findUnique({ where: { id: reg.planId! } });
      if (!plan) throw new NotFoundError("INVALID_PLAN", "Plan not found");
      subscriptionPlanId = plan.id;
      subscriptionStatus = "ACTIVE";
      subscriptionBillingCycle = reg.billingCycle!;
      if (reg.billingCycle === "YEARLY") {
        subscriptionExpiresAt = new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        );
      } else if (reg.billingCycle === "MONTHLY") {
        subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else {
        throw new BadRequestError(
          "INVALID_BILLING_CYCLE",
          `Unsupported billing cycle: ${reg.billingCycle}`,
        );
      }
      isDemo = false;
    } else {
      const demoPlan = await prisma.plan.findUnique({
        where: { slug: "demo" },
      });
      if (!demoPlan) throw new Error("Demo plan not seeded");
      subscriptionPlanId = demoPlan.id;
      subscriptionStatus = "DEMO";
      subscriptionBillingCycle = "DEMO";
      subscriptionExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      isDemo = true;
    }

    const business = await prisma.business.create({
      data: {
        name: reg.businessName,
        ownerId: reg.submittedBy,
        status: "ACTIVE",
        isDemo,
        spaces: {
          create: [
            {
              name: reg.spaceName,
              address: reg.spaceAddress,
              spaceType: reg.spaceType,
            },
          ],
        },
        subscription: {
          create: {
            planId: subscriptionPlanId,
            status: subscriptionStatus,
            billingCycle: subscriptionBillingCycle,
            startsAt: new Date(),
            expiresAt: subscriptionExpiresAt,
            activatedBy: reviewerId,
            activatedAt: new Date(),
          },
        },
      },
      include: { owner: { select: { userId: true } } },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: reg.submittedBy, roleId: ownerRole.id },
      },
      update: { businessId: business.id },
      create: {
        userId: reg.submittedBy,
        roleId: ownerRole.id,
        businessId: business.id,
      },
    });

    await prisma.staffMember.upsert({
      where: {
        userId_businessId: { userId: reg.submittedBy, businessId: business.id },
      },
      update: {},
      create: {
        userId: reg.submittedBy,
        businessId: business.id,
        status: "OWNER",
        isOnDuty: false,
      },
    });

    await prisma.businessRegistration.update({
      where: { businessRegistrationId: registrationId },
      data: {
        status: "APPROVED",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
        resultBusinessId: business.id,
        linkId: null,
      },
    });
  } else {
    await prisma.businessRegistration.update({
      where: { businessRegistrationId: registrationId },
      data: {
        status: data.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
      },
    });
  }

  const updated = await prisma.businessRegistration.findUnique({
    where: { businessRegistrationId: registrationId },
    include: {
      submitter: { select: { userId: true, name: true, phone: true } },
    },
  });
  return formatRegistration(updated!);
}
