import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRole(req, "VERIFIER");

  const q = req.nextUrl.searchParams;
  const status = q.get("status") ?? undefined;
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(q.get("pageSize") ?? "20", 10));

  const where = status ? { status } : {};
  const [requests, total] = await prisma.$transaction([
    prisma.subscriptionRequest.findMany({
      where,
      include: {
        plan: {
          select: {
            planId: true,
            name: true,
            slug: true,
            priceMonthlyPaise: true,
            priceYearlyPaise: true,
          },
        },
        requester: { select: { userId: true, name: true, phone: true } },
        business: { select: { name: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscriptionRequest.count({ where }),
  ]);
  return ok({ data: requests, total, page, pageSize });
});
