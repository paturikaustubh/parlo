import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import type { AuthPayload } from "@/types/auth";

export const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60; // 365 days

/** Generate a cryptographically random 64-char hex token */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 hash of the raw token — this is what gets stored in DB */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issue a new auth token for a user.
 * - Stores hash in auth_sessions (DB)
 * - Stores raw token → payload in Redis with 365-day TTL
 * - Adds raw token to per-user Redis set for invalidation support
 * Returns the raw token (return to client, store in localStorage).
 */
export async function issueToken(
  userId: number,
  roles: string[],
  userAgent?: string,
  ipAddress?: string,
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

  const session = await prisma.authSession.create({
    data: { userId, tokenHash, expiresAt, userAgent, ipAddress },
  });

  const payload: AuthPayload = { userId, sessionId: session.id, roles };
  await Promise.all([
    redis.setex(
      `auth:token:${token}`,
      TOKEN_TTL_SECONDS,
      JSON.stringify(payload),
    ),
    redis
      .pipeline()
      .sadd(`auth:user:${userId}:tokens`, token)
      .expire(`auth:user:${userId}:tokens`, TOKEN_TTL_SECONDS)
      .exec(),
  ]);

  return token;
}
