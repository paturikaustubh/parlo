import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, created } from "@/lib/respond";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertStaffLimit } from "@/lib/subscription-limits";

const schema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/),
  spaceId: z.string().uuid().optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "No business found");

  const targetUser = await prisma.user.findUnique({
    where: { phone: parsed.data.phone },
  });
  if (!targetUser)
    throw new NotFoundError(
      "PHONE_NOT_REGISTERED",
      "No account found for this phone number",
    );

  const existing = await prisma.staffMember.findFirst({
    where: { userId: targetUser.id, businessId: business.id },
  });
  if (existing && existing.status !== "REMOVED")
    throw new ConflictError("ALREADY_STAFF", "User is already a staff member");

  await assertStaffLimit(business.id);

  let spaceDbId: number | undefined;
  if (parsed.data.spaceId) {
    const space = await prisma.space.findUnique({
      where: { spaceId: parsed.data.spaceId },
    });
    spaceDbId = space?.id;
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitation = await prisma.staffInvitation.create({
    data: {
      businessId: business.id,
      phone: parsed.data.phone,
      spaceId: spaceDbId,
      expiresAt,
    },
  });

  return created({ invitationId: invitation.staffInvitationId });
});
