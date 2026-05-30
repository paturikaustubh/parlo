import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { TOKEN_TTL_SECONDS } from "@/lib/token";
import type { AuthPayload } from "@/types/auth";
import { ForbiddenError, UnauthorizedError } from "./errors";
import type { UserRole } from "@/shared/types";

/**
 * Validate Bearer token from Authorization header.
 * Redis is the fast path; DB is the fallback (re-warms Redis on hit).
 * Returns AuthPayload or null (caller must return 401).
 */
export async function requireAuth(
  req: NextRequest,
): Promise<AuthPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // ── Fast path: Redis ─────────────────────────────────────────────
  const cached = await redis.get<AuthPayload>(`auth:token:${token}`);
  if (cached) {
    // Extend sliding TTL
    await redis.expire(`auth:token:${token}`, TOKEN_TTL_SECONDS);
    return cached;
  }

  // ── Slow path: DB ────────────────────────────────────────────────
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const session = await prisma.authSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: { userRoles: { include: { role: true } } },
      },
    },
  });

  if (!session || !session.user.isActive) return null;

  const roles = session.user.userRoles.map((ur) => ur.role.code);
  const payload: AuthPayload = {
    userId: session.userId,
    sessionId: session.id,
    roles,
  };
  const newExpiry = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

  // Re-warm Redis + update DB expiry (sliding window)
  await Promise.all([
    redis.setex(
      `auth:token:${token}`,
      TOKEN_TTL_SECONDS,
      JSON.stringify(payload),
    ),
    prisma.authSession.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry, lastUsedAt: new Date() },
    }),
  ]);

  return payload;
}

/**
 * Validate Bearer token and require specific roles.
 * Throws UnauthorizedError (401) if not authenticated.
 * Throws ForbiddenError (403) if user lacks required roles.
 * Returns AuthPayload on success.
 */
export async function requireRole(
  req: NextRequest,
  ...roles: UserRole[]
): Promise<AuthPayload> {
  const auth = await requireAuth(req);

  if (!auth) {
    throw new UnauthorizedError("Authentication required");
  }

  const hasRole = roles.some((role) => auth.roles.includes(role));
  if (roles.length > 0 && !hasRole) {
    throw new ForbiddenError(
      "INSUFFICIENT_ROLE",
      `Required role: ${roles.join(" | ")}`,
    );
  }

  return auth;
}

export function requireCronAuth(req: NextRequest): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not set");
  const token = (req.headers.get("authorization") ?? "")
    .replace("Bearer ", "")
    .trim();
  if (token !== secret)
    throw new ForbiddenError("FORBIDDEN", "Invalid cron secret");
}
