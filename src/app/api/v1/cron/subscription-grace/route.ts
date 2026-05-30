import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  requireCronAuth(req);

  const now = new Date();
  const graceEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const subscriptions = await prisma.businessSubscription.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: now },
    },
    select: { id: true, subscriptionId: true, businessId: true },
  });

  const ids = subscriptions.map((s) => s.subscriptionId);
  let processed = 0;

  if (ids.length > 0) {
    const result = await prisma.businessSubscription.updateMany({
      where: { subscriptionId: { in: ids } },
      data: { status: "GRACE", graceExpiresAt: graceEnd },
    });
    processed = result.count;
  }

  return ok({ processed, ids });
});
