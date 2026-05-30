import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok, created } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { submitRegistration } from "@/services/business.service";
import { prisma } from "@/lib/db";
import { formatRegistration } from "@/repositories/business.repository";

const schema = z
  .object({
    businessName: z.string().min(1).max(200),
    spaceType: z.string().max(100).optional(),
    spaceName: z.string().min(1).max(200),
    spaceAddress: z.string().min(1),
    licenseNumber: z.string().max(100).optional(),
    gstNumber: z.string().max(20).optional(),
    documentUrls: z
      .record(z.string(), z.string().url())
      .refine((r) => Object.keys(r).length > 0, {
        message: "At least one document is required",
      }),
    planId: z.string().uuid(),
    billingCycle: z.enum(["MONTHLY", "YEARLY", "DEMO"]),
    paymentProofUrl: z.string().optional(),
  })
  .refine((d) => d.billingCycle === "DEMO" || !!d.paymentProofUrl, {
    message: "Payment proof required for paid plans",
    path: ["paymentProofUrl"],
  });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "USER", "STAFF", "OWNER", "VERIFIER");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const plan = await prisma.plan.findUnique({
    where: { planId: parsed.data.planId },
    select: { id: true, isActive: true },
  });
  if (!plan || !plan.isActive)
    throw new ValidationError({ planId: "Invalid or inactive plan" });

  return created(
    await submitRegistration(payload.userId, {
      businessName: parsed.data.businessName,
      spaceType: parsed.data.spaceType,
      spaceName: parsed.data.spaceName,
      spaceAddress: parsed.data.spaceAddress,
      licenseNumber: parsed.data.licenseNumber,
      gstNumber: parsed.data.gstNumber,
      documentUrls: parsed.data.documentUrls,
      planId: plan.id,
      billingCycle: parsed.data.billingCycle,
      paymentProofUrl: parsed.data.paymentProofUrl,
    }),
  );
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRole(req, "VERIFIER");

  const q = req.nextUrl.searchParams;
  const status = q.get("status") ?? undefined;
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(q.get("pageSize") ?? "20", 10));

  const where = status ? { status } : {};
  const [registrations, total] = await prisma.$transaction([
    prisma.businessRegistration.findMany({
      where,
      include: {
        submitter: { select: { userId: true, name: true, phone: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessRegistration.count({ where }),
  ]);
  return ok({
    data: registrations.map(formatRegistration),
    total,
    page,
    pageSize,
  });
});
