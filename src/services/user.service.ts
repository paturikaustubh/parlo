import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import {
  findUserById,
  formatUser,
  formatRoles,
  updateUser,
} from "@/repositories/user.repository";

export async function getMe(userId: number) {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("NOT_FOUND", "User not found");
  return { ...formatUser(user), roles: formatRoles(user) };
}

export async function updateMe(userId: number, data: { name?: string }) {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("NOT_FOUND", "User not found");
  const updated = await updateUser(userId, data);
  return formatUser(updated);
}

export async function checkPhoneExists(phone: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true },
  });
  return user !== null;
}
