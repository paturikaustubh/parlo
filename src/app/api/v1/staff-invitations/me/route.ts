import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "USER", "OWNER", "STAFF");

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { phone: true },
  });
  if (!user) return ok({ data: [] });

  const invitations = await prisma.staffInvitation.findMany({
    where: {
      phone: user.phone,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: {
      business: { select: { businessId: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    data: invitations.map((inv) => ({
      invitationId: inv.staffInvitationId,
      businessId: inv.business.businessId,
      businessName: inv.business.name,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    })),
  });
});
