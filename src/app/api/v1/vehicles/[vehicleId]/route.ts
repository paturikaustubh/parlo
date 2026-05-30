import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { ok, noContent, withErrorHandling } from "@/lib/respond";
import { editVehicle, removeVehicle } from "@/services/vehicle.service";
import type { VehicleType } from "@/shared/types";

const VEHICLE_TYPES = [
  "TWO_WHEELER",
  "THREE_WHEELER",
  "FOUR_WHEELER",
  "HEAVY",
] as const;

const patchSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES).optional(),
  vehicleNumber: z
    .string()
    .min(1)
    .max(20)
    .transform((s) => s.toUpperCase())
    .optional(),
  nickname: z.string().max(100).nullable().optional(),
});

type Ctx = { params: Promise<{ vehicleId: string }> };

export const PATCH = withErrorHandling(
  async (req: NextRequest, ctx: unknown) => {
    const payload = await requireAuth(req);
    if (!payload) throw new UnauthorizedError();

    const { vehicleId } = await (ctx as Ctx).params;

    const body = await req.json();
    const result = patchSchema.safeParse(body);
    if (!result.success) {
      const details = Object.fromEntries(
        result.error.issues.map((i) => [i.path.join("."), i.message]),
      );
      throw new ValidationError(details);
    }

    const vehicle = await editVehicle(payload.userId, vehicleId, {
      vehicleType: result.data.vehicleType as VehicleType | undefined,
      vehicleNumber: result.data.vehicleNumber,
      nickname: result.data.nickname,
    });
    return ok(vehicle);
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: unknown) => {
    const payload = await requireAuth(req);
    if (!payload) throw new UnauthorizedError();

    const { vehicleId } = await (ctx as Ctx).params;

    await removeVehicle(payload.userId, vehicleId);
    return noContent();
  },
);
