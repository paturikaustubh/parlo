import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import {
  listStaffByBusiness,
  formatStaff,
} from "@/repositories/staff.repository";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ spaceId: string }> };

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireRole(req, "OWNER");
  const { spaceId } = await ctx.params;

  const space = await prisma.space.findUnique({
    where: { spaceId },
    select: { id: true, businessId: true },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const staff = await listStaffByBusiness(space.businessId, {
    spaceId: space.id,
    status,
  });
  return ok(
    staff.map((s) => formatStaff(s as Parameters<typeof formatStaff>[0])),
  );
});
