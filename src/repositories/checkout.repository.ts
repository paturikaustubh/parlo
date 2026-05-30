import { prisma } from "@/lib/db";
import type { CheckoutRequest } from "@/shared/types";

const checkoutInclude = {
  sessions: {
    include: {
      parkingSession: {
        include: { space: { select: { spaceId: true, name: true } } },
      },
    },
  },
  space: { select: { spaceId: true } },
  user: { select: { userId: true, name: true, phone: true } },
  approver: {
    select: {
      staffMemberId: true,
      user: { select: { name: true, phone: true } },
    },
  },
} as const;

export function formatCheckoutRequest(
  r: Awaited<ReturnType<typeof prisma.checkoutRequest.findUniqueOrThrow>>,
): CheckoutRequest {
  const raw = r as unknown as {
    checkoutRequestId: string;
    requestCode: string;
    spaceId: number;
    userId: number | null;
    status: string;
    combinedAmountPaise: number;
    expiresAt: Date;
    approvedBy: number | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
    space: { spaceId: string };
    user: { userId: string; name: string; phone: string } | null;
    approver: {
      staffMemberId: string;
      user: { name: string; phone: string };
    } | null;
    sessions: Array<{
      parkingSession: {
        parkingSessionId: string;
        vehicleNumber: string;
        vehicleType: string;
        checkedInAt: Date;
        checkedOutAt: Date | null;
        amountPaise: number | null;
        space: { spaceId: string; name: string };
      };
    }>;
  };
  return {
    checkoutRequestId: raw.checkoutRequestId,
    requestCode: raw.requestCode,
    spaceId: raw.space.spaceId,
    userId: raw.user?.userId ?? null,
    userName: raw.user?.name ?? null,
    userPhone: raw.user?.phone ?? null,
    status: raw.status as CheckoutRequest["status"],
    combinedAmountPaise: raw.combinedAmountPaise,
    expiresAt: raw.expiresAt.toISOString(),
    approvedBy: raw.approver?.staffMemberId ?? null,
    approvedAt: raw.approvedAt?.toISOString() ?? null,
    approverName: raw.approver?.user?.name ?? null,
    approverPhone: raw.approver?.user?.phone ?? null,
    rejectionReason: raw.rejectionReason,
    sessions: raw.sessions.map((s) => ({
      parkingSessionId: s.parkingSession.parkingSessionId,
      vehicleNumber: s.parkingSession.vehicleNumber,
      vehicleType: s.parkingSession
        .vehicleType as CheckoutRequest["sessions"][0]["vehicleType"],
      checkedInAt: s.parkingSession.checkedInAt.toISOString(),
      checkedOutAt: s.parkingSession.checkedOutAt?.toISOString() ?? null,
      amountPaise: s.parkingSession.amountPaise,
    })),
    createdAt: raw.createdAt.toISOString(),
  };
}

export async function findCheckoutRequestById(checkoutRequestId: string) {
  return prisma.checkoutRequest.findUnique({
    where: { checkoutRequestId },
    include: checkoutInclude,
  });
}

export async function listCheckoutRequests(filters: {
  spaceIds?: number[];
  status?: string;
  page: number;
  pageSize: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.spaceIds?.length) where.spaceId = { in: filters.spaceIds };
  if (filters.status) where.status = filters.status;

  const [requests, total] = await prisma.$transaction([
    prisma.checkoutRequest.findMany({
      where,
      include: checkoutInclude,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.checkoutRequest.count({ where }),
  ]);
  return { requests, total };
}
