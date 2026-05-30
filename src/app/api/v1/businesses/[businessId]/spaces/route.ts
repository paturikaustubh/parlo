import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ businessId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireRole(req, "USER", "OWNER", "STAFF");
  const { businessId } = await ctx.params;

  const business = await prisma.business.findUnique({ where: { businessId } });
  if (!business) throw new NotFoundError("NOT_FOUND", "Business not found");

  const spaces = await prisma.space.findMany({
    where: { businessId: business.id, isActive: true },
    select: { spaceId: true, name: true, address: true },
    orderBy: { name: "asc" },
  });

  return ok(spaces);
});
