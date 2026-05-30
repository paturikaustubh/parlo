import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "USER", "OWNER", "STAFF");

  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

  const businesses = await prisma.business.findMany({
    where: {
      status: "ACTIVE",
      ownerId: { not: payload.userId },
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    select: { businessId: true, name: true },
    orderBy: { name: "asc" },
    take: 20,
  });

  return ok(businesses);
});
