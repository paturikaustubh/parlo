import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");
  const q = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(q.get("pageSize") ?? "20", 10));
  const action = q.get("action") ?? undefined;
  const spaceId = q.get("spaceId") ?? undefined;

  const business = await prisma.business.findFirst({
    where: { ownerId: payload.userId },
    select: { id: true },
  });
  if (!business)
    throw new NotFoundError("BUSINESS_NOT_FOUND", "No business found");

  // Resolve optional spaceId UUID → integer id
  let spaceDbId: number | undefined;
  if (spaceId) {
    const space = await prisma.space.findUnique({
      where: { spaceId },
      select: { id: true },
    });
    spaceDbId = space?.id;
  }

  const where: Record<string, unknown> = { businessId: business.id };
  if (action) where.action = action;
  if (spaceDbId) where.spaceId = spaceDbId;

  const [entries, total] = await prisma.$transaction([
    prisma.auditEntry.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { name: true } },
        space: { select: { name: true } },
      },
    }),
    prisma.auditEntry.count({ where }),
  ]);

  const data = entries.map((e) => ({
    auditId: e.auditId,
    businessId: e.businessId.toString(),
    spaceId: e.spaceId?.toString() ?? null,
    actorId: e.actorId.toString(),
    actorName: e.actor.name,
    spaceName: e.space?.name ?? null,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    metadata: e.metadata,
    createdAt: e.createdAt.toISOString(),
  }));

  return ok({
    data,
    total,
    page,
    pageSize,
    lastPage: Math.ceil(total / pageSize) || 1,
    nextCursor: null,
  });
});
