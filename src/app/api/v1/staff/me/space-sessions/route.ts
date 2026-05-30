import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { getSpaceSessions } from "@/services/staff.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "STAFF", "OWNER");
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  return ok(await getSpaceSessions(payload.userId, status));
});
