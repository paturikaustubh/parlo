import { NextRequest } from "next/server";
import { withErrorHandling, noContent } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "STAFF", "OWNER");

  const member = await prisma.staffMember.findFirst({
    where: { userId: payload.userId, status: "ACTIVE" },
  });
  if (!member)
    throw new NotFoundError("NOT_FOUND", "No active staff membership found");

  await prisma.staffMember.update({
    where: { id: member.id },
    data: { status: "REMOVED" },
  });

  const staffRole = await prisma.role.findUnique({ where: { code: "STAFF" } });
  if (staffRole) {
    await prisma.userRole.updateMany({
      where: {
        userId: payload.userId,
        roleId: staffRole.id,
        businessId: member.businessId,
      },
      data: { isActive: false },
    });
  }

  return noContent();
});
