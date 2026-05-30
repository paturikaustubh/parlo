import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  return ok(plans.map((p) => ({ ...p, id: p.planId, slug: p.slug })));
});
