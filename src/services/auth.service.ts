import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { issueToken } from "@/lib/token";
import { requireAuth } from "@/lib/auth";
import { noContent } from "@/lib/respond";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import {
  findUserByPhone,
  createUser,
  formatUser,
  formatRoles,
} from "@/repositories/user.repository";
import type { NextRequest } from "next/server";

const OTP_TTL = 10 * 60;

export async function sendOtp(phone: string): Promise<void> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.setex(`otp:${phone}`, OTP_TTL, otp);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV OTP] ${phone} → ${otp}`);
  }
}

export async function verifyOtpForSignin(phone: string, otp: string) {
  const stored = await redis.get(`otp:${phone}`);
  if (!stored || String(stored) !== otp)
    throw new BadRequestError("INVALID_OTP", "Invalid or expired OTP");
  await redis.del(`otp:${phone}`);

  const user = await findUserByPhone(phone);
  if (!user)
    throw new NotFoundError(
      "PHONE_NOT_REGISTERED",
      "No account found for this phone number",
    );
  if (!user.isActive)
    throw new ForbiddenError("FORBIDDEN", "Account is disabled");

  const roles = user.userRoles.map((ur) => ur.role.code);
  const token = await issueToken(user.id, roles);
  return { token, user: formatUser(user), roles: formatRoles(user) };
}

export async function signInWithPassword(phone: string, password: string) {
  const user = await findUserByPhone(phone);
  if (!user) throw new UnauthorizedError("Invalid phone number or password");
  if (!user.passwordHash)
    throw new BadRequestError(
      "PASSWORD_NOT_SET",
      "No password set — use OTP to sign in",
    );

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid phone number or password");
  if (!user.isActive)
    throw new ForbiddenError("FORBIDDEN", "Account is disabled");

  const roles = user.userRoles.map((ur) => ur.role.code);
  const token = await issueToken(user.id, roles);
  return { token, user: formatUser(user) };
}

export async function signUp(phone: string, name: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing)
    throw new ConflictError(
      "PHONE_ALREADY_REGISTERED",
      "An account with this number already exists",
    );

  const userRole = await prisma.role.findUnique({ where: { code: "USER" } });
  if (!userRole)
    throw new ForbiddenError(
      "ROLE_NOT_SEEDED",
      "System not properly initialized",
    );

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({
    phone,
    name,
    passwordHash,
    roleId: userRole.id,
  });

  const roles = user.userRoles.map((ur) => ur.role.code);
  const token = await issueToken(user.id, roles);
  return { token, user: formatUser(user) };
}

export async function invalidateUserSessions(userId: number): Promise<void> {
  const tokens = (await redis.smembers(
    `auth:user:${userId}:tokens`,
  )) as string[];
  await Promise.all([
    ...tokens.map((t) => redis.del(`auth:token:${t}`)),
    redis.del(`auth:user:${userId}:tokens`),
    prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function logout(req: NextRequest) {
  const payload = await requireAuth(req);
  if (!payload) return noContent();
  await invalidateUserSessions(payload.userId);
  return noContent();
}

export async function setPassword(
  userId: number,
  currentPassword: string | undefined,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("NOT_FOUND", "User not found");

  if (user.passwordHash) {
    if (!currentPassword)
      throw new BadRequestError(
        "VALIDATION_ERROR",
        "currentPassword required when password is already set",
      );
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
