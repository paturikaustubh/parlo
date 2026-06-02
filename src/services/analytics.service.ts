import { prisma } from "@/lib/db";
import { getOwnerAnalyticsConfig } from "@/lib/subscription-limits";

export async function getUserAnalytics(
  userId: number,
  from?: string,
  to?: string,
) {
  const where: Record<string, unknown> = { userId };
  if (from || to)
    where.checkedInAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };

  const sessions = await prisma.parkingSession.findMany({
    where: { ...where, status: "COMPLETED" },
    include: { space: { select: { spaceId: true, name: true } } },
  });

  const totalSessions = sessions.length;
  const totalSpentPaise = sessions.reduce(
    (sum, s) => sum + (s.amountPaise ?? 0),
    0,
  );
  const avgDurationMinutes = totalSessions
    ? Math.round(
        sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0) /
          totalSessions,
      )
    : 0;

  const spaceCount = new Map<string, { spaceName: string; count: number }>();
  const vehicleCount = new Map<string, number>();

  for (const s of sessions) {
    const k = s.space.spaceId;
    if (!spaceCount.has(k))
      spaceCount.set(k, { spaceName: s.space.name, count: 0 });
    spaceCount.get(k)!.count++;
    vehicleCount.set(s.vehicleType, (vehicleCount.get(s.vehicleType) ?? 0) + 1);
  }

  const monthMap = new Map<
    string,
    { spentPaise: number; sessionCount: number }
  >();

  for (const s of sessions) {
    if (!s.checkedInAt) continue;
    const d = s.checkedInAt;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM (local/IST)
    const prev = monthMap.get(month) ?? { spentPaise: 0, sessionCount: 0 };
    monthMap.set(month, {
      spentPaise: prev.spentPaise + (s.amountPaise ?? 0),
      sessionCount: prev.sessionCount + 1,
    });
  }
  const spendingTrend = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      spentPaise: v.spentPaise,
      sessionCount: v.sessionCount,
    }));

  return {
    totalSessions,
    totalSpentPaise,
    avgDurationMinutes,
    mostVisitedSpaces: [...spaceCount.entries()]
      .map(([spaceId, v]) => ({
        spaceId,
        spaceName: v.spaceName,
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    vehicleUsage: [...vehicleCount.entries()].map(([vehicleType, count]) => ({
      vehicleType,
      count,
    })),
    spendingTrend,
  };
}

export async function getStaffAnalytics(
  userId: number,
  from?: string,
  to?: string,
) {
  const member = await prisma.staffMember.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (!member)
    return {
      totalCheckIns: 0,
      totalCheckOuts: 0,
      totalRejections: 0,
      avgApprovalTimeSeconds: 0,
      totalShiftHours: 0,
      dailyTrend: [],
    };

  const dateWhere =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        }
      : undefined;

  const [checkIns, checkOuts, rejections] = await prisma.$transaction([
    prisma.parkingSession.count({
      where: {
        checkedInByStaffId: member.id,
        ...(dateWhere ? { checkedInAt: dateWhere } : {}),
      },
    }),
    prisma.parkingSession.count({
      where: {
        checkedOutByStaffId: member.id,
        ...(dateWhere ? { checkedOutAt: dateWhere } : {}),
      },
    }),
    prisma.checkoutRequest.count({
      where: { approvedBy: member.id, status: "REJECTED" },
    }),
  ]);

  return {
    totalCheckIns: checkIns,
    totalCheckOuts: checkOuts,
    totalRejections: rejections,
    avgApprovalTimeSeconds: 0,
    totalShiftHours: 0,
    dailyTrend: [],
  };
}

export async function getOwnerAnalytics(
  userId: number,
  from?: string,
  to?: string,
) {
  const business = await prisma.business.findFirst({
    where: { ownerId: userId },
  });
  if (!business)
    return {
      totalRevenuePaise: 0,
      totalSessions: 0,
      avgDurationMinutes: 0,
      currentlyParked: 0,
      onDutyStaff: 0,
      activeRequests: 0,
      dailyRevenueTrend: [],
      spaceUtilization: [],
      vehicleTypeMix: [],
      peakHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })),
      staffPerformance: [],
    };

  const { cutoffDate, staffPerformanceEnabled } = await getOwnerAnalyticsConfig(
    business.id,
  );
  if (cutoffDate !== null) {
    const cutoffStr = cutoffDate.toISOString();
    if (!from || from < cutoffStr) from = cutoffStr;
  }

  const spaces = await prisma.space.findMany({
    where: { businessId: business.id },
    select: { id: true, spaceId: true, name: true },
  });
  const spaceIds = spaces.map((s) => s.id);
  const spaceMap = new Map(
    spaces.map((s) => [s.id, { spaceId: s.spaceId, name: s.name }]),
  );

  const dateWhere =
    from || to
      ? {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        }
      : undefined;

  // ── Sessions ─────────────────────────────────────────────────────────────
  const sessions = await prisma.parkingSession.findMany({
    where: {
      spaceId: { in: spaceIds },
      status: "COMPLETED",
      ...(dateWhere ? { checkedOutAt: dateWhere } : {}),
    },
    select: {
      spaceId: true,
      vehicleType: true,
      durationMinutes: true,
      amountPaise: true,
      overrideAmountPaise: true,
      checkedOutAt: true,
    },
  });

  const totalRevenuePaise = sessions.reduce(
    (sum, s) => sum + (s.overrideAmountPaise ?? s.amountPaise ?? 0),
    0,
  );
  const totalSessions = sessions.length;
  const avgDurationMinutes = totalSessions
    ? Math.round(
        sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0) /
          totalSessions,
      )
    : 0;

  // ── Daily trend ───────────────────────────────────────────────────────────
  const dailyMap = new Map<
    string,
    { revenuePaise: number; sessionCount: number }
  >();
  for (const s of sessions) {
    if (!s.checkedOutAt) continue;
    const date = s.checkedOutAt.toISOString().slice(0, 10);
    const prev = dailyMap.get(date) ?? { revenuePaise: 0, sessionCount: 0 };
    dailyMap.set(date, {
      revenuePaise:
        prev.revenuePaise + (s.overrideAmountPaise ?? s.amountPaise ?? 0),
      sessionCount: prev.sessionCount + 1,
    });
  }
  const dailyRevenueTrend = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // ── Space utilization ─────────────────────────────────────────────────────
  const spaceUtilMap = new Map<
    number,
    { sessionCount: number; revenuePaise: number }
  >();
  for (const s of sessions) {
    const prev = spaceUtilMap.get(s.spaceId) ?? {
      sessionCount: 0,
      revenuePaise: 0,
    };
    spaceUtilMap.set(s.spaceId, {
      sessionCount: prev.sessionCount + 1,
      revenuePaise:
        prev.revenuePaise + (s.overrideAmountPaise ?? s.amountPaise ?? 0),
    });
  }
  const spaceUtilization = [...spaceUtilMap.entries()]
    .map(([id, v]) => ({
      spaceId: spaceMap.get(id)!.spaceId,
      spaceName: spaceMap.get(id)!.name,
      ...v,
    }))
    .sort((a, b) => b.revenuePaise - a.revenuePaise);

  // ── Vehicle type mix ──────────────────────────────────────────────────────
  const vehicleMap = new Map<string, number>();
  for (const s of sessions)
    vehicleMap.set(s.vehicleType, (vehicleMap.get(s.vehicleType) ?? 0) + 1);
  const vehicleTypeMix = [...vehicleMap.entries()].map(
    ([vehicleType, count]) => ({ vehicleType, count }),
  );

  // ── Peak hours ────────────────────────────────────────────────────────────
  const hourMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourMap.set(h, 0);
  for (const s of sessions) {
    if (!s.checkedOutAt) continue;
    const h = s.checkedOutAt.getHours();
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1);
  }
  const peakHours = [...hourMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, count]) => ({ hour, count }));

  // ── Staff performance ─────────────────────────────────────────────────────
  let staffPerformance: {
    staffMemberId: string;
    name: string;
    checkIns: number;
    checkOuts: number;
    approvals: number;
  }[] = [];
  if (staffPerformanceEnabled) {
    const staffMembers = await prisma.staffMember.findMany({
      where: { businessId: business.id, status: { not: "OWNER" } },
      include: { user: { select: { name: true } } },
    });
    const staffIds = staffMembers.map((m) => m.id);

    const [checkIns, checkOuts, approvals] = await Promise.all([
      prisma.parkingSession.groupBy({
        by: ["checkedInByStaffId"],
        where: {
          spaceId: { in: spaceIds },
          checkedInByStaffId: { in: staffIds },
          ...(dateWhere ? { checkedInAt: dateWhere } : {}),
        },
        _count: { _all: true },
      }),
      prisma.parkingSession.groupBy({
        by: ["checkedOutByStaffId"],
        where: {
          spaceId: { in: spaceIds },
          checkedOutByStaffId: { in: staffIds },
          ...(dateWhere ? { checkedOutAt: dateWhere } : {}),
        },
        _count: { _all: true },
      }),
      prisma.checkoutRequest.groupBy({
        by: ["approvedBy"],
        where: {
          spaceId: { in: spaceIds },
          approvedBy: { in: staffIds },
          status: "APPROVED",
          ...(dateWhere ? { approvedAt: dateWhere } : {}),
        },
        _count: { _all: true },
      }),
    ]);

    const checkInMap = new Map(
      checkIns.map((r) => [
        r.checkedInByStaffId!,
        (r._count as { _all: number })._all ?? 0,
      ]),
    );
    const checkOutMap = new Map(
      checkOuts.map((r) => [
        r.checkedOutByStaffId!,
        (r._count as { _all: number })._all ?? 0,
      ]),
    );
    const approvalMap = new Map(
      approvals.map((r) => [
        r.approvedBy!,
        (r._count as { _all: number })._all ?? 0,
      ]),
    );

    staffPerformance = staffMembers
      .map((m) => ({
        staffMemberId: m.staffMemberId,
        name: m.user.name,
        checkIns: checkInMap.get(m.id) ?? 0,
        checkOuts: checkOutMap.get(m.id) ?? 0,
        approvals: approvalMap.get(m.id) ?? 0,
      }))
      .filter((m) => m.checkIns + m.checkOuts + m.approvals > 0)
      .sort((a, b) => b.checkIns + b.checkOuts - (a.checkIns + a.checkOuts));
  }

  const [currentlyParked, onDutyStaff, activeRequests, byTypeRaw] =
    await Promise.all([
      prisma.parkingSession.count({
        where: { spaceId: { in: spaceIds }, status: "ACTIVE" },
      }),
      prisma.staffMember.count({
        where: {
          businessId: business.id,
          isOnDuty: true,
          status: { not: "OWNER" },
        },
      }),
      prisma.checkoutRequest.count({
        where: { spaceId: { in: spaceIds }, status: "PENDING" },
      }),
      prisma.parkingSession.groupBy({
        by: ["vehicleType"],
        where: {
          spaceId: { in: spaceIds },
          status: { in: ["ACTIVE", "CHECKOUT_REQUESTED"] },
        },
        _count: { vehicleType: true },
      }),
    ]);

  const byType: Record<string, number> = Object.fromEntries(
    byTypeRaw.map((r) => [r.vehicleType, r._count.vehicleType]),
  );

  return {
    totalRevenuePaise,
    totalSessions,
    avgDurationMinutes,
    currentlyParked,
    onDutyStaff,
    activeRequests,
    byType,
    dailyRevenueTrend,
    spaceUtilization,
    vehicleTypeMix,
    peakHours,
    staffPerformance,
  };
}
