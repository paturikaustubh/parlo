import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { ok, created, withErrorHandling } from "@/lib/respond";
import { getUserVehicles, addVehicle } from "@/services/vehicle.service";
import type { VehicleType } from "@/shared/types";

const VEHICLE_TYPES = [
  "TWO_WHEELER",
  "THREE_WHEELER",
  "FOUR_WHEELER",
  "HEAVY",
] as const;

const postSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES),
  vehicleNumber: z
    .string()
    .min(1)
    .max(20)
    .transform((s) => s.toUpperCase()),
  nickname: z.string().max(100).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();

  const vehicles = await getUserVehicles(payload.userId);
  return ok(vehicles);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();

  const body = await req.json();
  const result = postSchema.safeParse(body);
  if (!result.success) {
    const details = Object.fromEntries(
      result.error.issues.map((i) => [i.path.join("."), i.message]),
    );
    throw new ValidationError(details);
  }

  const vehicle = await addVehicle(payload.userId, {
    vehicleType: result.data.vehicleType as VehicleType,
    vehicleNumber: result.data.vehicleNumber,
    nickname: result.data.nickname,
  });
  return created(vehicle);
});
