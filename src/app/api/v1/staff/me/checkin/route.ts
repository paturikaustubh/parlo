import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, created } from "@/lib/respond";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { checkInOnBehalf } from "@/services/staff.service";
import { assertBusinessSubscriptionActive } from "@/lib/subscription-limits";
import { prisma } from "@/lib/db";

const schema = z.object({
  vehicleNumber: z.string().min(1).max(20),
  vehicleType: z.enum([
    "TWO_WHEELER",
    "THREE_WHEELER",
    "FOUR_WHEELER",
    "HEAVY",
  ]),
  phone: z
    .string()
    .regex(/^\+91\d{10}$/)
    .optional(),
  spaceId: z.string().uuid().optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "STAFF", "OWNER");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  // Resolve businessId for subscription gate
  const member = await prisma.staffMember.findFirst({
    where: { userId: payload.userId, status: "ACTIVE" },
    select: { businessId: true, spaceId: true },
  });
  if (!member)
    throw new ForbiddenError(
      "FORBIDDEN",
      "Staff member not found for this user.",
    );
  await assertBusinessSubscriptionActive(member.businessId);

  // Verify provided spaceId belongs to this staff member's business
  if (parsed.data.spaceId) {
    const targetSpace = await prisma.space.findUnique({
      where: { spaceId: parsed.data.spaceId },
      select: { businessId: true },
    });
    if (!targetSpace || targetSpace.businessId !== member.businessId)
      throw new ForbiddenError("FORBIDDEN", "Space not in your business");
  }

  return created(await checkInOnBehalf(payload.userId, parsed.data));
});
