import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  findStaffByUserId,
  formatStaff,
  updateStaffDuty,
} from "@/repositories/staff.repository";
import {
  formatSession,
  sessionInclude,
} from "@/repositories/session.repository";
import {
  calculateAmount,
  calculateAmountFromVersion,
} from "@/services/pricing.service";

export async function getStaffMe(userId: number) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");
  return formatStaff(member as Parameters<typeof formatStaff>[0]);
}

export async function setDutyStatus(userId: number, isOnDuty: boolean) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");
  const updated = await updateStaffDuty(member.id, isOnDuty);
  return {
    isOnDuty: updated.isOnDuty,
    dutyStartedAt: updated.dutyStartedAt?.toISOString() ?? null,
  };
}

export async function getStaffActivity(userId: number) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");

  const sessions = await prisma.parkingSession.findMany({
    where: {
      OR: [
        { checkedInByStaffId: member.id },
        { checkedOutByStaffId: member.id },
      ],
    },
    include: {
      vehicle: { select: { vehicleNumber: true, vehicleType: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return sessions.map((s) => ({
    sessionId: s.parkingSessionId,
    vehicleNumber: s.vehicle?.vehicleNumber ?? s.vehicleNumber ?? "Unknown",
    vehicleType: s.vehicle?.vehicleType ?? s.vehicleType ?? null,
    action: s.checkedOutByStaffId === member.id ? "checkout" : "checkin",
    timestamp:
      (s.checkedOutByStaffId === member.id
        ? s.checkedOutAt
        : s.checkedInAt
      )?.toISOString() ?? s.createdAt.toISOString(),
  }));
}

export async function getStaffActionedSessions(
  userId: number,
  params: {
    search?: string;
    actionType?: "checkin" | "checkout" | "both";
    vehicleType?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const { search, actionType, vehicleType, page = 1, pageSize = 20 } = params;
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");

  // DB-level actionType filter for accurate pagination
  const actionWhere =
    actionType === "checkin"
      ? {
          checkedInByStaffId: member.id,
          OR: [
            { checkedOutByStaffId: null },
            { checkedOutByStaffId: { not: member.id } },
          ],
        }
      : actionType === "checkout"
        ? {
            checkedOutByStaffId: member.id,
            OR: [
              { checkedInByStaffId: null },
              { checkedInByStaffId: { not: member.id } },
            ],
          }
        : actionType === "both"
          ? {
              checkedInByStaffId: member.id,
              checkedOutByStaffId: member.id,
            }
          : {
              OR: [
                { checkedInByStaffId: member.id },
                { checkedOutByStaffId: member.id },
              ],
            };

  const searchOr = search
    ? [
        { vehicleNumber: { contains: search, mode: "insensitive" as const } },
        { guestName: { contains: search, mode: "insensitive" as const } },
        { guestPhone: { contains: search, mode: "insensitive" as const } },
        { user: { name: { contains: search, mode: "insensitive" as const } } },
        { user: { phone: { contains: search, mode: "insensitive" as const } } },
      ]
    : undefined;

  const where = {
    ...actionWhere,
    ...(vehicleType ? { vehicleType } : {}),
    ...(searchOr ? { AND: [{ OR: searchOr }] } : {}),
  };

  const [sessions, total, revenueAgg] = await prisma.$transaction([
    prisma.parkingSession.findMany({
      where,
      include: sessionInclude,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.parkingSession.count({ where }),
    prisma.parkingSession.aggregate({ where, _sum: { amountPaise: true } }),
  ]);

  const now = Date.now();
  const data = await Promise.all(
    sessions.map(async (s) => {
      const formatted = formatSession(s as any);
      const at =
        s.checkedInByStaffId === member.id &&
        s.checkedOutByStaffId === member.id
          ? "both"
          : s.checkedInByStaffId === member.id
            ? "checkin"
            : "checkout";

      if (s.status === "ACTIVE" || s.status === "CHECKOUT_REQUESTED") {
        const durationMinutes = Math.max(
          0,
          Math.floor((now - s.checkedInAt.getTime()) / 60000),
        );
        const pricingVersionId = (s as any).pricingVersionId as number | null;
        const estimatedAmountPaise = pricingVersionId
          ? await calculateAmountFromVersion(
              pricingVersionId,
              s.vehicleType,
              durationMinutes,
            )
          : await calculateAmount(s.spaceId, s.vehicleType, durationMinutes);
        return { ...formatted, actionType: at, estimatedAmountPaise };
      }
      return { ...formatted, actionType: at };
    }),
  );

  return {
    data,
    total,
    page,
    pageSize,
    lastPage: Math.ceil(total / pageSize) || 1,
    totalRevenuePaise: revenueAgg._sum.amountPaise ?? 0,
  };
}

export async function getStaffMetricsPeriod(
  userId: number,
  period: "today" | "week" | "month",
) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");

  const now = new Date();
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(now.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }

  const [checkIns, checkOuts, currentlyParked, totalCheckouts] =
    await prisma.$transaction([
      prisma.parkingSession.count({
        where: { checkedInByStaffId: member.id, checkedInAt: { gte: start } },
      }),
      prisma.parkingSession.count({
        where: { checkedOutByStaffId: member.id, checkedOutAt: { gte: start } },
      }),
      prisma.parkingSession.count({
        where: { spaceId: member.spaceId ?? undefined, status: "ACTIVE" },
      }),
      prisma.parkingSession.count({
        where: {
          checkedOutByStaffId: member.id,
          checkedOutAt: { gte: start },
          status: "COMPLETED",
        },
      }),
    ]);

  const byTypeRaw = await prisma.parkingSession.groupBy({
    by: ["vehicleType"],
    where: {
      spaceId: member.spaceId ?? undefined,
      status: { in: ["ACTIVE", "CHECKOUT_REQUESTED"] },
    },
    _count: { vehicleType: true },
  });
  const byType: Record<string, number> = Object.fromEntries(
    byTypeRaw.map((r) => [r.vehicleType, r._count.vehicleType]),
  );

  const shiftHours =
    member.isOnDuty && member.dutyStartedAt
      ? (Date.now() - member.dutyStartedAt.getTime()) / 3600000
      : 0;

  const approvalRate =
    checkOuts > 0 ? Math.round((totalCheckouts / checkOuts) * 100) : 100;

  return {
    period,
    checkIns,
    checkOuts,
    currentlyParked,
    byType,
    approvalRate,
    shiftHoursToday: Math.round(shiftHours * 10) / 10,
    isOnDuty: member.isOnDuty,
    dutyStartedAt: member.dutyStartedAt?.toISOString() ?? null,
  };
}

export async function checkInOnBehalf(
  userId: number,
  data: {
    vehicleNumber: string;
    vehicleType: string;
    phone?: string;
    spaceId?: string;
  },
) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");
  if (!member.isOnDuty)
    throw new ForbiddenError(
      "OFF_DUTY",
      "Must be on duty to check in vehicles",
    );

  let spaceDbId = member.spaceId;
  if (data.spaceId && !member.spaceId) {
    const space = await prisma.space.findUnique({
      where: { spaceId: data.spaceId },
      select: { id: true },
    });
    if (!space) throw new NotFoundError("SPACE_NOT_FOUND", "Space not found");
    spaceDbId = space.id;
  }
  if (!spaceDbId)
    throw new NotFoundError("SPACE_NOT_FOUND", "No space assigned");

  let linkedUserId: number | null = null;
  if (data.phone) {
    const user = await prisma.user.findUnique({
      where: { phone: data.phone },
      select: { id: true },
    });
    linkedUserId = user?.id ?? null;
  }

  const session = await prisma.parkingSession.create({
    data: {
      spaceId: spaceDbId,
      userId: linkedUserId,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType,
      guestPhone: data.phone ?? null,
      status: "ACTIVE",
      checkedInByStaffId: member.id,
      checkedInAt: new Date(),
    },
  });

  return {
    sessionId: session.parkingSessionId,
    vehicleNumber: session.vehicleNumber,
    vehicleType: session.vehicleType,
    checkedInAt: session.checkedInAt?.toISOString(),
    spaceId: session.spaceId,
  };
}

export async function getSpaceSessions(userId: number, status?: string) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");
  if (!member.spaceId) return [];

  const sessions = await prisma.parkingSession.findMany({
    where: {
      spaceId: member.spaceId,
      ...(status ? { status } : {}),
    },
    include: sessionInclude,
    orderBy: { checkedInAt: "desc" },
    take: 50,
  });

  const now = Date.now();
  return Promise.all(
    sessions.map(async (s) => {
      const formatted = formatSession(s as any);
      if (s.status === "ACTIVE" || s.status === "CHECKOUT_REQUESTED") {
        const durationMinutes = Math.max(
          0,
          Math.floor((now - s.checkedInAt.getTime()) / 60000),
        );
        const pricingVersionId = (s as any).pricingVersionId as number | null;
        const estimatedAmountPaise = pricingVersionId
          ? await calculateAmountFromVersion(
              pricingVersionId,
              s.vehicleType,
              durationMinutes,
            )
          : await calculateAmount(s.spaceId, s.vehicleType, durationMinutes);
        return { ...formatted, estimatedAmountPaise };
      }
      return formatted;
    }),
  );
}

export async function createStaffNote(userId: number, body: string) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");

  const note = await prisma.staffNote.create({
    data: { staffMemberId: member.id, body },
  });
  return {
    staffNoteId: note.staffNoteId,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
  };
}

export async function getStaffNotes(userId: number) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");

  const notes = await prisma.staffNote.findMany({
    where: { staffMemberId: member.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return notes.map((n) => ({
    staffNoteId: n.staffNoteId,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function createStaffFlag(
  userId: number,
  data: { type: string; description: string },
) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");

  const flag = await prisma.staffFlag.create({
    data: {
      staffMemberId: member.id,
      businessId: member.businessId,
      type: data.type,
      description: data.description,
    },
  });
  return {
    staffFlagId: flag.staffFlagId,
    type: flag.type,
    description: flag.description,
    status: flag.status,
    createdAt: flag.createdAt.toISOString(),
  };
}

export async function getStaffFlags(userId: number) {
  const member = await findStaffByUserId(userId);
  if (!member) throw new NotFoundError("NOT_FOUND", "Staff profile not found");

  const flags = await prisma.staffFlag.findMany({
    where: { staffMemberId: member.id },
    orderBy: { createdAt: "desc" },
  });
  return flags.map((f) => ({
    staffFlagId: f.staffFlagId,
    type: f.type,
    description: f.description,
    status: f.status,
    createdAt: f.createdAt.toISOString(),
    resolvedAt: f.resolvedAt?.toISOString() ?? null,
  }));
}
