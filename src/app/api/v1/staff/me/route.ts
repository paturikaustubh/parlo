import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { getStaffMe, setDutyStatus } from "@/services/staff.service";
import { NextResponse } from "next/server";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "STAFF", "OWNER");
  return ok(await getStaffMe(payload.userId));
});

const patchSchema = { isOnDuty: { type: "boolean" } } as const;

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "STAFF", "OWNER");
  const body = await req.json().catch(() => null);
  if (typeof body?.isOnDuty !== "boolean") {
    throw new ValidationError({ isOnDuty: "boolean required" });
  }
  return ok(await setDutyStatus(payload.userId, body.isOnDuty));
});
