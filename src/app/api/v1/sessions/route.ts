import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok, created } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth";
import { checkIn, getSessions } from "@/services/session.service";
import { prisma } from "@/lib/db";

const VEHICLE_TYPES = [
  "TWO_WHEELER",
  "THREE_WHEELER",
  "FOUR_WHEELER",
  "HEAVY",
] as const;

const checkInSchema = z
  .object({
    actionSessionId: z.string(),
    vehicleId: z.string().uuid().optional(),
    guestName: z.string().min(1).max(200).optional(),
    guestPhone: z.string().min(10).max(15).optional(),
    guestVehicleType: z.enum(VEHICLE_TYPES).optional(),
    guestVehicleNumber: z.string().max(20).optional(),
  })
  .refine(
    (d) =>
      d.vehicleId ||
      (d.guestName &&
        d.guestPhone &&
        d.guestVehicleType &&
        d.guestVehicleNumber),
    {
      message:
        "Guest check-in requires name, phone, vehicleType, and vehicleNumber",
    },
  );

export const POST = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  const body = await req.json().catch(() => null);
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  const session = await checkIn({ ...parsed.data, userId: payload?.userId });
  return created(session);
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  const q = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(q.get("pageSize") ?? "20", 10));
  const status = q.get("status") ?? undefined;
  const guestPhone = q.get("guestPhone") ?? undefined;
  const tokenId = q.get("tokenId") ?? undefined;
  const search = q.get("search") ?? undefined;
  const from = q.get("from") ?? undefined;
  const to = q.get("to") ?? undefined;

  let spaceDbId: number | undefined;
  const spaceId = q.get("spaceId");
  if (spaceId) {
    const space = await prisma.space.findUnique({
      where: { spaceId },
      select: { id: true },
    });
    spaceDbId = space?.id;
  }

  const result = await getSessions({
    userId: payload?.userId,
    spaceId: spaceDbId,
    status,
    guestPhone,
    tokenId,
    search,
    from,
    to,
    page,
    pageSize,
  });
  return ok({
    ...result,
    lastPage: Math.ceil(result.total / result.pageSize) || 1,
    nextCursor: null,
  });
});
