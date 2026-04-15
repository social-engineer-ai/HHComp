import { putObject, type PutResult } from "./s3";

/**
 * Read a File (from a server action FormData) into a Buffer,
 * upload to S3, return the put result.
 */
export async function uploadFormFile(
  file: File,
  prefix: string
): Promise<PutResult & { mimeType: string; originalFilename: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mime = file.type || "application/octet-stream";
  const put = await putObject({
    prefix,
    filename: file.name,
    contentType: mime,
    body: buffer,
  });
  return {
    ...put,
    mimeType: mime,
    originalFilename: file.name,
  };
}

export type FileValidationRule = {
  maxSizeBytes: number;
  allowedExtensions: string[]; // lowercase, without dot
  allowedMimeTypes?: string[];
};

export function validateFile(
  file: File,
  rule: FileValidationRule
): string | null {
  if (file.size === 0) return "File is empty.";
  if (file.size > rule.maxSizeBytes)
    return `File exceeds the ${(rule.maxSizeBytes / 1024 / 1024).toFixed(0)} MB limit.`;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!rule.allowedExtensions.includes(ext))
    return `File type .${ext} is not allowed. Accepted: ${rule.allowedExtensions.map((e) => "." + e).join(", ")}`;
  if (rule.allowedMimeTypes && rule.allowedMimeTypes.length > 0) {
    if (!rule.allowedMimeTypes.includes(file.type)) {
      // Some browsers omit mime — only reject if a type was provided and doesn't match
      if (file.type) return `File MIME type ${file.type} is not allowed.`;
    }
  }
  return null;
}
