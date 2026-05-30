import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ invitationId: string }> };

export const POST = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "USER", "OWNER", "STAFF");
  const { invitationId } = await ctx.params;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, phone: true },
  });
  if (!user) throw new NotFoundError("NOT_FOUND", "User not found");

  const invitation = await prisma.staffInvitation.findUnique({
    where: { staffInvitationId: invitationId },
  });
  if (!invitation) throw new NotFoundError("NOT_FOUND", "Invitation not found");
  if (invitation.phone !== user.phone)
    throw new ForbiddenError("FORBIDDEN", "This invitation is not for you");
  if (invitation.status !== "PENDING")
    throw new ConflictError(
      "INVITATION_NOT_PENDING",
      "Invitation is no longer pending",
    );
  if (invitation.expiresAt < new Date())
    throw new ConflictError("INVITATION_EXPIRED", "Invitation has expired");

  const staffRole = await prisma.role.findUnique({ where: { code: "STAFF" } });
  if (!staffRole) throw new Error("STAFF role not seeded");

  await prisma.$transaction([
    prisma.staffInvitation.update({
      where: { staffInvitationId: invitationId },
      data: { status: "ACCEPTED" },
    }),
    prisma.staffMember.upsert({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId: invitation.businessId,
        },
      },
      update: { status: "ACTIVE", spaceId: invitation.spaceId },
      create: {
        userId: user.id,
        businessId: invitation.businessId,
        spaceId: invitation.spaceId,
        status: "ACTIVE",
      },
    }),
    prisma.userRole.upsert({
      where: {
        userId_roleId_businessId: {
          userId: user.id,
          roleId: staffRole.id,
          businessId: invitation.businessId,
        },
      },
      create: {
        userId: user.id,
        roleId: staffRole.id,
        businessId: invitation.businessId,
      },
      update: { isActive: true },
    }),
  ]);

  return ok({ success: true });
});
