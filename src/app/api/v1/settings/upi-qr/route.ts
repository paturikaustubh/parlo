import { withErrorHandling, ok } from "@/lib/respond";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async () => {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "upi_qr_content" },
  });
  if (!setting)
    throw new NotFoundError("NOT_FOUND", "UPI QR content not configured");
  return ok({ content: setting.value });
});
