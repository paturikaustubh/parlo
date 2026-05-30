import { NextRequest } from "next/server";
import { withErrorHandling, ok } from "@/lib/respond";
import { requireRole } from "@/lib/auth";
import { BadRequestError } from "@/lib/errors";
import { uploadFile } from "@/services/storage.service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireRole(req);

  const formData = await req.formData();
  const file = formData.get("file");
  const purpose =
    (formData.get("purpose") as string | null) ?? "business-document";

  if (!(file instanceof File)) {
    throw new BadRequestError("VALIDATION_ERROR", "File is required");
  }

  const result = await uploadFile(file, purpose);
  return ok(result);
});
