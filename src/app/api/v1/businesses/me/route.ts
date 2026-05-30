import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { getMyBusiness } from "@/services/business.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const payload = await requireRole(req, "OWNER");
  return ok(await getMyBusiness(payload.userId));
});
