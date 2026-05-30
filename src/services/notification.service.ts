import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function createNotification(input: {
  userId: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data:
        input.data !== undefined
          ? (input.data as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
  });
}

export async function notifyOnDutyStaff(
  spaceId: number,
  type: string,
  title: string,
  body: string,
  payload: Record<string, unknown>,
) {
  const staff = await prisma.staffMember.findMany({
    where: { spaceId, isOnDuty: true, status: "ACTIVE" },
    select: { userId: true },
  });
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { businessId: true },
  });
  if (space) {
    const bizStaff = await prisma.staffMember.findMany({
      where: {
        businessId: space.businessId,
        spaceId: null,
        isOnDuty: true,
        status: "ACTIVE",
      },
      select: { userId: true },
    });
    staff.push(...bizStaff);
  }

  const unique = [...new Set(staff.map((s) => s.userId))];
  await Promise.all(
    unique.map((userId) =>
      createNotification({ userId, type, title, body, data: payload }),
    ),
  );
}
