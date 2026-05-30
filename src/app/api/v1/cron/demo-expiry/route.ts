import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  requireCronAuth(req);

  const now = new Date();

  const subscriptions = await prisma.businessSubscription.findMany({
    where: {
      status: "DEMO",
      expiresAt: { lt: now },
    },
    select: { id: true, subscriptionId: true, businessId: true },
  });

  const ids = subscriptions.map((s) => s.subscriptionId);
  let processed = 0;

  if (ids.length > 0) {
    const result = await prisma.businessSubscription.updateMany({
      where: { subscriptionId: { in: ids } },
      data: { status: "EXPIRED" },
    });
    processed = result.count;
  }

  return ok({ processed, ids });
});
