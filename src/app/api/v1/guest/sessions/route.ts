import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const phone = req.nextUrl.searchParams.get("phone")?.trim();
  if (!phone) throw new ValidationError({ phone: "required" });

  const sessions = await prisma.parkingSession.findMany({
    where: { guestPhone: phone, status: "ACTIVE" },
    include: { space: { select: { name: true } } },
    orderBy: { checkedInAt: "desc" },
  });

  return ok(
    sessions.map((s) => ({
      parkingSessionId: s.parkingSessionId,
      spaceName: s.space.name,
      vehicleNumber: s.vehicleNumber,
      vehicleType: s.vehicleType,
      checkedInAt: s.checkedInAt,
    })),
  );
});
