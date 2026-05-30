import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { UnauthorizedError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth";
import {
  getUserAnalytics,
  getStaffAnalytics,
  getOwnerAnalytics,
} from "@/services/analytics.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireAuth(req);
  if (!payload) throw new UnauthorizedError();

  const q = req.nextUrl.searchParams;
  const from = q.get("from") ?? undefined;
  const to = q.get("to") ?? undefined;

  if (payload.roles.includes("OWNER"))
    return ok(await getOwnerAnalytics(payload.userId, from, to));
  if (payload.roles.includes("STAFF"))
    return ok(await getStaffAnalytics(payload.userId, from, to));
  return ok(await getUserAnalytics(payload.userId, from, to));
});
