import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/respond";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { approveRegistration } from "@/services/business.service";
import { prisma } from "@/lib/db";
import { formatRegistration } from "@/repositories/business.repository";

type Ctx = { params: Promise<{ registrationId: string }> };

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireRole(req, "VERIFIER");
  const { registrationId } = await ctx.params;
  const reg = await prisma.businessRegistration.findUnique({
    where: { businessRegistrationId: registrationId },
    include: {
      submitter: { select: { userId: true, name: true, phone: true } },
    },
  });
  if (!reg) throw new NotFoundError("NOT_FOUND", "Registration not found");
  return ok(formatRegistration(reg));
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const payload = await requireRole(req, "VERIFIER");
  const { registrationId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError({});

  return ok(
    await approveRegistration(registrationId, payload.userId, parsed.data),
  );
});
