import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "USER", "OWNER");

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(
    req.nextUrl.searchParams.get("pageSize") ?? "20",
    10,
  );

  const [requests, total] = await prisma.$transaction([
    prisma.staffRequest.findMany({
      where: {
        userId: payload.userId,
        ...(status ? { status } : {}),
      },
      include: {
        business: {
          select: {
            businessId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.staffRequest.count({
      where: {
        userId: payload.userId,
        ...(status ? { status } : {}),
      },
    }),
  ]);

  return ok({
    data: requests,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});
