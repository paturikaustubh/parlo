import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, created } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { checkInOnBehalf } from "@/services/staff.service";

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
  return created(await checkInOnBehalf(payload.userId, parsed.data));
});
