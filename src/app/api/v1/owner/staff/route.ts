import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import {
  listStaffByBusiness,
  formatStaff,
} from "@/repositories/staff.repository";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "No business found");

  const q = req.nextUrl.searchParams;
  const status = q.get("status") ?? undefined;
  let spaceDbId: number | undefined;
  const spaceId = q.get("spaceId");
  if (spaceId) {
    const space = await prisma.space.findUnique({
      where: { spaceId },
      select: { id: true },
    });
    spaceDbId = space?.id;
  }

  const staff = await listStaffByBusiness(business.id, {
    spaceId: spaceDbId,
    status,
  });

  const staffIds = staff.map((s) => s.id);
  const flagCounts = await prisma.staffFlag.groupBy({
    by: ["staffMemberId"],
    where: { staffMemberId: { in: staffIds }, status: "OPEN" },
    _count: { id: true },
  });
  const flagMap = new Map(
    flagCounts.map((f) => [f.staffMemberId, f._count.id]),
  );

  return ok(
    staff.map((s) => ({
      ...formatStaff(s as Parameters<typeof formatStaff>[0]),
      openFlagCount: flagMap.get(s.id) ?? 0,
    })),
  );
});
