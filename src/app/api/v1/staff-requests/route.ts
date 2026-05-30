import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, created, ok } from "@/lib/respond";
import { ValidationError, ConflictError, NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  businessId: z.string().uuid(),
  spaceId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "USER", "STAFF", "OWNER");

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const business = await prisma.business.findUnique({
    where: { businessId: parsed.data.businessId },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "Business not found");

  if (business.ownerId === payload.userId)
    throw new ConflictError(
      "OWNER_CANNOT_APPLY",
      "You are the owner of this business",
    );

  const existing = await prisma.staffMember.findFirst({
    where: { userId: payload.userId, businessId: business.id },
  });
  if (existing)
    throw new ConflictError(
      "ALREADY_STAFF",
      "Already a staff member of this business",
    );

  const pending = await prisma.staffRequest.findFirst({
    where: {
      userId: payload.userId,
      businessId: business.id,
      status: "PENDING",
    },
  });
  if (pending)
    throw new ConflictError(
      "STAFF_REQUEST_PENDING",
      "You already have a pending request for this business",
    );

  let spaceDbId: number | undefined;
  if (parsed.data.spaceId) {
    const space = await prisma.space.findUnique({
      where: { spaceId: parsed.data.spaceId },
    });
    spaceDbId = space?.id;
  }

  const req2 = await prisma.staffRequest.create({
    data: {
      userId: payload.userId,
      businessId: business.id,
      spaceId: spaceDbId,
      notes: parsed.data.notes,
    },
  });
  return created({ id: req2.staffRequestId, status: req2.status });
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "No business found");

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const requests = await prisma.staffRequest.findMany({
    where: { businessId: business.id, ...(status ? { status } : {}) },
    include: {
      user: { select: { userId: true, name: true, phone: true } },
      space: { select: { spaceId: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(requests);
});
