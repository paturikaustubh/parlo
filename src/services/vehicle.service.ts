import type { Vehicle, VehicleType } from "@/shared/types";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { findUserById } from "@/repositories/user.repository";
import {
  formatVehicle,
  listVehicles,
  findVehicle,
  findVehicleByNumber,
  createVehicle,
  updateVehicle,
  softDeleteVehicle,
  hasActiveSession,
} from "@/repositories/vehicle.repository";

export async function getUserVehicles(userId: number): Promise<Vehicle[]> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");
  const vehicles = await listVehicles(userId);
  return vehicles.map((v) => formatVehicle(v, user.userId));
}

export async function addVehicle(
  userId: number,
  data: { vehicleType: VehicleType; vehicleNumber: string; nickname?: string },
): Promise<Vehicle> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");

  const existing = await findVehicleByNumber(userId, data.vehicleNumber);
  if (existing)
    throw new ConflictError(
      "VEHICLE_ALREADY_EXISTS",
      "A vehicle with this number is already registered",
    );

  const vehicle = await createVehicle(userId, data);
  return formatVehicle(vehicle, user.userId);
}

export async function editVehicle(
  userId: number,
  vehicleId: string,
  data: {
    vehicleType?: VehicleType;
    vehicleNumber?: string;
    nickname?: string | null;
  },
): Promise<Vehicle> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");

  const existing = await findVehicle(vehicleId, userId);
  if (!existing)
    throw new NotFoundError("VEHICLE_NOT_FOUND", "Vehicle not found");

  const updated = await updateVehicle(vehicleId, data);
  return formatVehicle(updated, user.userId);
}

export async function removeVehicle(
  userId: number,
  vehicleId: string,
): Promise<void> {
  const existing = await findVehicle(vehicleId, userId);
  if (!existing)
    throw new NotFoundError("VEHICLE_NOT_FOUND", "Vehicle not found");

  const parked = await hasActiveSession(existing.id);
  if (parked)
    throw new BadRequestError(
      "VEHICLE_ALREADY_PARKED",
      "Vehicle has an active parking session",
    );

  await softDeleteVehicle(vehicleId);
}
