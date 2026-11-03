import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export const DIRECT_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;
export const DIRECT_UPLOAD_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "docm", "xls", "xlsx", "xlsm", "ppt", "pptx", "pptm",
  "csv", "tsv", "txt", "rtf", "odt", "ods", "odp", "md", "json", "xml",
  "yaml", "yml", "eml", "msg", "zip", "7z", "rar", "jpg", "jpeg", "png",
  "gif", "webp", "bmp", "tif", "tiff", "svg", "heic", "heif",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff", "svg", "heic", "heif"]);

export function directUploadResourceType(fileName: string): "image" | "raw" {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension === "pdf" || IMAGE_EXTENSIONS.has(extension) ? "image" : "raw";
}

export function directUploadPublicId(prefix: string, fileName: string, resourceType: "image" | "raw") {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const unique = randomUUID();
  return resourceType === "raw" ? `${prefix}/${unique}.${extension}` : `${prefix}/${unique}`;
}

function signature(encoded: string, secret: string) {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createDirectUploadTicket(payload: Record<string, unknown> & { expiresAt: number }, secret: string) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function readDirectUploadTicket<T extends { expiresAt: number }>(token: string, secret: string): T | null {
  const [encoded, provided] = token.split(".");
  if (!encoded || !provided) return null;
  const expected = signature(encoded, secret);
  const actualBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
