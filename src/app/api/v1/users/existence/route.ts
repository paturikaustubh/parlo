import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/respond";
import { checkPhoneExists } from "@/services/user.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const phone = req.nextUrl.searchParams.get("phone") ?? "";
  const exists = await checkPhoneExists(phone);
  return ok({ exists });
});
