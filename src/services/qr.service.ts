import { randomUUID, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { GoneError, BadRequestError, NotFoundError } from "@/lib/errors";

const QR_TTL = 2 * 60; // 120s
const ACTION_TTL = 5 * 60; // 300s

export async function getOrRotateQr(spaceId: number) {
  const spaceKey = `qr:space:${spaceId}`;

  let uuid = await redis.get<string>(spaceKey);

  if (!uuid) {
    uuid = randomUUID();
    await Promise.all([
      redis.setex(spaceKey, QR_TTL, uuid),
      redis.setex(`qr:uuid:${uuid}`, QR_TTL, String(spaceId)),
    ]);
  }

  const ttl = await redis.ttl(spaceKey);
  const expiresAt = Date.now() + ttl * 1000;

  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  const pricingRules = await prisma.pricingRule.findMany({
    where: { spaceId, isActive: true, amountPaise: { gt: 0 } },
    select: { vehicleType: true },
  });
  const supportedVehicleTypes = [
    ...new Set(pricingRules.map((r) => r.vehicleType)),
  ];

  return {
    uuid,
    expiresAt,
    spaceName: space.name,
    ttlSeconds: QR_TTL,
    supportedVehicleTypes,
  };
}

export interface ActionSession {
  id: string;
  spaceId: string; // UUID
  spaceName: string;
  businessName: string;
  expiresAt: number;
  supportedVehicleTypes: string[];
}

export async function createActionSession(
  uuid: string,
): Promise<ActionSession> {
  const raw = await redis.get<string>(`qr:uuid:${uuid}`);
  if (!raw)
    throw new GoneError("QR_EXPIRED", "QR code has expired or is invalid");

  const spaceDbId = parseInt(
    typeof raw === "string" ? raw : JSON.stringify(raw),
    10,
  );

  const space = await prisma.space.findUnique({
    where: { id: spaceDbId },
    include: { business: true },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  const pricingRules = await prisma.pricingRule.findMany({
    where: { spaceId: spaceDbId, isActive: true, amountPaise: { gt: 0 } },
    select: { vehicleType: true },
  });
  const supportedVehicleTypes = [
    ...new Set(pricingRules.map((r) => r.vehicleType)),
  ];

  const id = randomBytes(16).toString("hex");
  const expiresAt = Date.now() + ACTION_TTL * 1000;

  const session: ActionSession = {
    id,
    spaceId: space.spaceId,
    spaceName: space.name,
    businessName: space.business.name,
    expiresAt,
    supportedVehicleTypes,
  };

  await redis.setex(`action:${id}`, ACTION_TTL, JSON.stringify(session));

  return session;
}

export async function consumeActionSession(actionSessionId: string) {
  const raw = await redis.get(`action:${actionSessionId}`);
  if (!raw)
    throw new BadRequestError(
      "ACTION_SESSION_EXPIRED",
      "Action session has expired or already been used",
    );

  const session: ActionSession =
    typeof raw === "string" ? JSON.parse(raw) : raw;

  await redis.del(`action:${actionSessionId}`);

  const space = await prisma.space.findUnique({
    where: { spaceId: session.spaceId },
  });
  if (!space) throw new NotFoundError("NOT_FOUND", "Space not found");

  return { spaceId: session.spaceId, spaceDbId: space.id };
}
