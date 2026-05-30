import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { getStaffActionedSessions } from "@/services/staff.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "STAFF", "OWNER");
  const q = req.nextUrl.searchParams;
  const raw = q.get("actionType") ?? undefined;
  const actionType =
    raw === "checkin" || raw === "checkout" || raw === "both" ? raw : undefined;

  return ok(
    await getStaffActionedSessions(payload.userId, {
      search: q.get("search") ?? undefined,
      actionType,
      vehicleType: q.get("vehicleType") ?? undefined,
      page: Math.max(1, parseInt(q.get("page") ?? "1", 10)),
      pageSize: Math.min(50, parseInt(q.get("pageSize") ?? "20", 10)),
    }),
  );
});
