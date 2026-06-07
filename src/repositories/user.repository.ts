import { prisma } from "@/lib/db";
import type { User, UserRoleEntry } from "@/shared/types";

type DbUser = Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>;
type DbUserWithRoles = DbUser & {
  userRoles: Array<{
    userRoleId: string;
    roleId: number;
    businessId: number | null;
    isActive: boolean;
    role: { code: string };
    business: { businessId: string } | null;
  }>;
};

export function formatUser(u: DbUser): User {
  return {
    userId: u.userId,
    name: u.name,
    phone: u.phone,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

export function formatRoles(u: DbUserWithRoles): UserRoleEntry[] {
  return u.userRoles.map((ur) => ({
    userRoleId: ur.userRoleId,
    role: ur.role.code as UserRoleEntry["role"],
    businessId: ur.business?.businessId ?? null,
    isActive: ur.isActive,
  }));
}

export async function findUserByPhone(phone: string) {
  return prisma.user.findUnique({
    where: { phone },
    include: {
      userRoles: {
        where: { isActive: true },
        include: { role: true, business: { select: { businessId: true } } },
      },
    },
  });
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: {
        where: { isActive: true },
        include: { role: true, business: { select: { businessId: true } } },
      },
    },
  });
}

export async function createUser(data: {
  phone: string;
  name: string;
  passwordHash: string;
  roleId: number;
}) {
  return prisma.user.create({
    data: {
      phone: data.phone,
      name: data.name,
      passwordHash: data.passwordHash,
      userRoles: { create: { roleId: data.roleId } },
    },
    include: {
      userRoles: {
        include: { role: true, business: { select: { businessId: true } } },
      },
    },
  });
}

export async function updateUser(id: number, data: { name?: string }) {
  return prisma.user.update({ where: { id }, data });
}
