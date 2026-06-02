import { prisma } from "@/lib/db";
import type { ParkingSession } from "@/shared/types";

type DbSession = Awaited<
  ReturnType<typeof prisma.parkingSession.findUniqueOrThrow>
>;

export function formatSession(
  s: DbSession & { space: { spaceId: string; name: string } },
): ParkingSession {
  return {
    parkingSessionId: s.parkingSessionId,
    spaceId: s.space.spaceId,
    space: { spaceId: s.space.spaceId, name: s.space.name },
    vehicleId: null,
    vehicleNickname: (s as any).vehicle?.nickname ?? null,
    vehicleNumber: s.vehicleNumber,
    vehicleType: s.vehicleType as ParkingSession["vehicleType"],
    guestName: s.guestName,
    guestPhone: s.guestPhone,
    tokenId: s.tokenId,
    isOnBehalf: s.isOnBehalf,
    userId: null,
    status: s.status as ParkingSession["status"],
    checkedInAt: s.checkedInAt.toISOString(),
    checkedOutAt: s.checkedOutAt?.toISOString() ?? null,
    durationMinutes: s.durationMinutes,
    amountPaise: s.amountPaise,
    overrideAmountPaise: s.overrideAmountPaise,
    overrideReason: s.overrideReason,
    checkedInByStaffId: null,
    checkedOutByStaffId: null,
    checkedInByName: (s as any).checkedInBy?.user?.name ?? null,
    checkedOutByName: (s as any).checkedOutBy?.user?.name ?? null,
    userName: (s as any).user?.name ?? null,
    userPhone: (s as any).user?.phone ?? null,
    checkedInByPhone: (s as any).checkedInBy?.user?.phone ?? null,
    checkedOutByPhone: (s as any).checkedOutBy?.user?.phone ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export const sessionInclude = {
  space: { select: { spaceId: true, name: true } },
  vehicle: { select: { vehicleId: true, nickname: true } },
  user: { select: { userId: true, name: true, phone: true } },
  checkedInBy: {
    select: {
      staffMemberId: true,
      user: { select: { name: true, phone: true } },
    },
  },
  checkedOutBy: {
    select: {
      staffMemberId: true,
      user: { select: { name: true, phone: true } },
    },
  },
};

export async function findSessionById(parkingSessionId: string) {
  return prisma.parkingSession.findUnique({
    where: { parkingSessionId },
    include: sessionInclude,
  });
}

export async function findSessionByDbId(id: number) {
  return prisma.parkingSession.findUnique({
    where: { id },
    include: sessionInclude,
  });
}

export async function listSessions(filters: {
  userId?: number;
  spaceId?: number;
  spaceIds?: number[];
  status?: string;
  guestPhone?: string;
  tokenId?: string;
  page: number;
  pageSize: number;
  search?: string;
  from?: string;
  to?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.spaceId) {
    where.spaceId = filters.spaceId;
  } else if (filters.spaceIds) {
    where.spaceId = { in: filters.spaceIds };
  }
  if (filters.status) where.status = filters.status;
  if (filters.guestPhone) where.guestPhone = filters.guestPhone;
  if (filters.tokenId) where.tokenId = filters.tokenId;

  if (filters.search) {
    where.OR = [
      { vehicleNumber: { contains: filters.search, mode: "insensitive" } },
      { guestName: { contains: filters.search, mode: "insensitive" } },
      { guestPhone: { contains: filters.search, mode: "insensitive" } },
      {
        vehicle: {
          nickname: { contains: filters.search, mode: "insensitive" },
        },
      },
      { space: { name: { contains: filters.search, mode: "insensitive" } } },
      { user: { name: { contains: filters.search, mode: "insensitive" } } },
      { user: { phone: { contains: filters.search, mode: "insensitive" } } },
    ];
  }
  if (filters.from || filters.to) {
    where.checkedInAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const [sessions, total] = await prisma.$transaction([
    prisma.parkingSession.findMany({
      where,
      include: sessionInclude,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { checkedInAt: "desc" },
    }),
    prisma.parkingSession.count({ where }),
  ]);
  return { sessions, total };
}

export async function createSession(data: {
  spaceId: number;
  vehicleId?: number;
  vehicleNumber: string;
  vehicleType: string;
  guestName?: string;
  guestPhone?: string;
  tokenId?: string;
  isOnBehalf: boolean;
  userId?: number;
  checkedInByStaffId?: number;
  pricingVersionId?: number;
}) {
  return prisma.parkingSession.create({ data, include: sessionInclude });
}

export async function updateSession(
  id: number,
  data: {
    status?: string;
    checkedOutAt?: Date;
    durationMinutes?: number;
    amountPaise?: number;
    overrideAmountPaise?: number;
    overrideReason?: string;
    checkedOutByStaffId?: number;
  },
) {
  return prisma.parkingSession.update({
    where: { id },
    data,
    include: sessionInclude,
  });
}
