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
    select: { phone: true },
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

  await prisma.staffInvitation.update({
    where: { staffInvitationId: invitationId },
    data: { status: "DECLINED" },
  });

  return ok({ success: true });
});
