import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ requestId: string }> };

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(500).optional(),
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "OWNER");
  const { requestId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const request = await prisma.staffRequest.findUnique({
    where: { staffRequestId: requestId },
  });
  if (!request) throw new NotFoundError("NOT_FOUND", "Staff request not found");
  if (request.status !== "PENDING")
    throw new ConflictError("VALIDATION_ERROR", "Request already reviewed");

  const business = await prisma.business.findFirst({
    where: { id: request.businessId, ownerId: payload.userId },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "Business not found");

  await prisma.staffRequest.update({
    where: { staffRequestId: requestId },
    data: {
      status: parsed.data.status,
      reviewNotes: parsed.data.reviewNotes,
      reviewedBy: payload.userId,
      reviewedAt: new Date(),
    },
  });

  if (parsed.data.status === "APPROVED") {
    const staffRole = await prisma.role.findUnique({
      where: { code: "STAFF" },
    });
    await prisma.staffMember.create({
      data: {
        userId: request.userId,
        businessId: request.businessId,
        spaceId: request.spaceId ?? undefined,
        status: "ACTIVE",
      },
    });
    if (staffRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId_businessId: {
            userId: request.userId,
            roleId: staffRole.id,
            businessId: request.businessId,
          },
        },
        create: {
          userId: request.userId,
          roleId: staffRole.id,
          businessId: request.businessId,
        },
        update: { isActive: true },
      });
    }
  }

  return ok({ id: requestId, status: parsed.data.status });
});
