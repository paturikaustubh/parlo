import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRegistration } from "@/repositories/business.repository";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "USER", "OWNER");

  const q = req.nextUrl.searchParams;
  const status = q.get("status") ?? undefined;
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(q.get("pageSize") ?? "20", 10));

  const where = {
    submittedBy: payload.userId,
    ...(status ? { status } : {}),
  };

  const [registrations, total] = await prisma.$transaction([
    prisma.businessRegistration.findMany({
      where,
      include: {
        submitter: { select: { userId: true, name: true, phone: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessRegistration.count({ where }),
  ]);

  return ok({
    data: registrations.map(formatRegistration),
    total,
    page,
    pageSize,
  });
});
