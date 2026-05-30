import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok, created } from "@/lib/respond";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStaffFlags, createStaffFlag } from "@/services/staff.service";

const schema = z.object({
  type: z.enum(["SPACE_ISSUE", "VEHICLE_ISSUE", "OTHER"]),
  description: z.string().min(1).max(500),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "STAFF", "OWNER");
  return ok(await getStaffFlags(payload.userId));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "STAFF", "OWNER");

  const isOwner = payload.roles.includes("OWNER");
  if (!isOwner) {
    const member = await prisma.staffMember.findFirst({
      where: { userId: payload.userId, status: "ACTIVE" },
      select: { isOnDuty: true },
    });
    if (!member?.isOnDuty) {
      throw new ForbiddenError(
        "OFF_DUTY",
        "You must be on duty to perform this action",
      );
    }
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});
  return created(await createStaffFlag(payload.userId, parsed.data));
});
