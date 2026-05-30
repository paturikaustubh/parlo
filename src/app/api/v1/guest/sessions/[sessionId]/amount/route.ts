import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import {
  calculateAmountFromVersion,
  calculateAmount,
} from "@/services/pricing.service";

type Ctx = { params: Promise<{ sessionId: string }> };

export const GET = withErrorHandling(async (_req: NextRequest, ctx: Ctx) => {
  const { sessionId } = await ctx.params;

  const session = await prisma.parkingSession.findUnique({
    where: { parkingSessionId: sessionId },
    select: {
      id: true,
      spaceId: true,
      vehicleType: true,
      checkedInAt: true,
      amountPaise: true,
      status: true,
      pricingVersionId: true,
    },
  });

  if (!session || !["ACTIVE", "CHECKOUT_REQUESTED"].includes(session.status)) {
    throw new NotFoundError("SESSION_NOT_FOUND", "Session not found");
  }

  const now = new Date();
  const durationMinutes = Math.ceil(
    (now.getTime() - session.checkedInAt.getTime()) / 60000,
  );

  const estimatedAmountPaise = session.pricingVersionId
    ? await calculateAmountFromVersion(
        session.pricingVersionId,
        session.vehicleType,
        durationMinutes,
      )
    : await calculateAmount(
        session.spaceId,
        session.vehicleType,
        durationMinutes,
      );

  return ok({ estimatedAmountPaise, durationMinutes });
});
