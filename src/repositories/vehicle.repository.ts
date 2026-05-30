import { prisma } from "@/lib/db";
import type { Vehicle, VehicleType } from "@/shared/types";

type DbVehicle = Awaited<ReturnType<typeof prisma.vehicle.findUniqueOrThrow>>;

export function formatVehicle(v: DbVehicle, userUuid: string): Vehicle {
  return {
    vehicleId: v.vehicleId,
    userId: userUuid,
    vehicleNumber: v.vehicleNumber,
    vehicleType: v.vehicleType as VehicleType,
    nickname: v.nickname,
    isActive: v.isActive,
    createdAt: v.createdAt.toISOString(),
  };
}

export async function listVehicles(userId: number) {
  return prisma.vehicle.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function findVehicle(vehicleId: string, userId: number) {
  return prisma.vehicle.findFirst({
    where: { vehicleId, userId },
  });
}

export async function findVehicleByNumber(
  userId: number,
  vehicleNumber: string,
) {
  return prisma.vehicle.findFirst({
    where: { userId, vehicleNumber, isActive: true },
  });
}

export async function createVehicle(
  userId: number,
  data: { vehicleType: string; vehicleNumber: string; nickname?: string },
) {
  return prisma.vehicle.create({
    data: {
      userId,
      vehicleType: data.vehicleType,
      vehicleNumber: data.vehicleNumber,
      nickname: data.nickname ?? null,
    },
  });
}

export async function updateVehicle(
  vehicleId: string,
  data: {
    vehicleType?: string;
    vehicleNumber?: string;
    nickname?: string | null;
  },
) {
  return prisma.vehicle.update({
    where: { vehicleId },
    data,
  });
}

export async function softDeleteVehicle(vehicleId: string) {
  return prisma.vehicle.update({
    where: { vehicleId },
    data: { isActive: false },
  });
}

export async function hasActiveSession(vehicleId: number): Promise<boolean> {
  const count = await prisma.parkingSession.count({
    where: { vehicleId, status: "ACTIVE" },
  });
  return count > 0;
}
