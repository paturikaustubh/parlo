import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { getStaffMetricsPeriod } from "@/services/staff.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "STAFF", "OWNER");
  const raw = req.nextUrl.searchParams.get("period") ?? "today";
  const period = (["today", "week", "month"] as const).includes(
    raw as "today" | "week" | "month",
  )
    ? (raw as "today" | "week" | "month")
    : "today";
  return ok(await getStaffMetricsPeriod(payload.userId, period));
});
