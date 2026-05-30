import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  requireCronAuth(req);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let softDeleted = 0;
  let hardDeleted = 0;

  // Phase 1: Soft-delete demo businesses whose subscription expired > 7 days ago
  const toSoftDelete = await prisma.business.findMany({
    where: {
      isDemo: true,
      deletedAt: null,
      subscription: {
        is: { status: "EXPIRED", expiresAt: { lt: sevenDaysAgo } },
      },
    },
    select: { id: true },
  });

  if (toSoftDelete.length > 0) {
    const result = await prisma.business.updateMany({
      where: { id: { in: toSoftDelete.map((b) => b.id) } },
      data: { deletedAt: new Date() },
    });
    softDeleted = result.count;
  }

  // Phase 2: Hard-delete businesses soft-deleted > 30 days ago
  const toHardDelete = await prisma.business.findMany({
    where: { deletedAt: { lt: thirtyDaysAgo } },
    select: { id: true },
  });

  if (toHardDelete.length > 0) {
    const result = await prisma.business.deleteMany({
      where: { id: { in: toHardDelete.map((b) => b.id) } },
    });
    hardDeleted = result.count;
  }

  return ok({ softDeleted, hardDeleted });
});
