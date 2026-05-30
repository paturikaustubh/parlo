import { NextRequest } from "next/server";
import { withErrorHandling, noContent } from "@/lib/respond";
import { logout } from "@/services/auth.service";

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  await logout(req);
  return noContent();
});
