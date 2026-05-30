import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { BadRequestError } from "@/lib/errors";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const BUCKET_BY_PURPOSE: Record<string, string> = {
  "payment-proof": "payment_proofs",
};

function getBucket(purpose: string): string {
  return (
    BUCKET_BY_PURPOSE[purpose] ??
    process.env.SUPABASE_STORAGE_BUCKET ??
    "business_docs"
  );
}

export async function uploadFile(
  file: File,
  purpose: string = "business-document",
): Promise<{ url: string; fileName: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(
      "FILE_TOO_LARGE",
      `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new BadRequestError(
      "INVALID_FILE_TYPE",
      `File type ${file.type} is not allowed`,
    );
  }

  const bucket = getBucket(purpose);
  const fileExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fileName = `${purpose}/${uuidv4()}.${fileExtension}`;
  const fileBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new BadRequestError("UPLOAD_FAILED", error.message);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return { url: urlData.publicUrl, fileName };
}
