import { prisma } from "@/lib/db";
import type { StaffMember } from "@/shared/types";

const staffInclude = {
  user: { select: { userId: true, name: true, phone: true } },
  business: { select: { businessId: true } },
  space: { select: { spaceId: true } },
} as const;

type DbStaff = Awaited<ReturnType<typeof prisma.staffMember.findUniqueOrThrow>>;
type DbStaffFull = DbStaff & {
  user: { userId: string; name: string; phone: string };
  business: { businessId: string };
  space: { spaceId: string } | null;
};

export function formatStaff(s: DbStaffFull): StaffMember {
  return {
    staffMemberId: s.staffMemberId,
    userId: s.user.userId,
    user: { userId: s.user.userId, name: s.user.name, phone: s.user.phone },
    businessId: s.business.businessId,
    spaceId: s.space?.spaceId ?? null,
    status: s.status as StaffMember["status"],
    isOnDuty: s.isOnDuty,
    dutyStartedAt: s.dutyStartedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export async function findStaffByUserId(userId: number) {
  return prisma.staffMember.findFirst({
    where: { userId, status: "ACTIVE" },
    include: staffInclude,
  });
}

export async function findStaffById(staffMemberId: string) {
  return prisma.staffMember.findUnique({
    where: { staffMemberId },
    include: staffInclude,
  });
}

export async function listStaffByBusiness(
  businessId: number,
  filters: { spaceId?: number; status?: string },
) {
  return prisma.staffMember.findMany({
    where: {
      businessId,
      status: filters.status ?? { not: "OWNER" },
      ...(filters.spaceId ? { spaceId: filters.spaceId } : {}),
    },
    include: staffInclude,
  });
}

export async function updateStaffDuty(id: number, isOnDuty: boolean) {
  return prisma.staffMember.update({
    where: { id },
    data: { isOnDuty, dutyStartedAt: isOnDuty ? new Date() : null },
    include: staffInclude,
  });
}
