import { randomUUID } from "crypto";
import {
  createDirectUploadTicket,
  readDirectUploadTicket,
} from "@/lib/cloudinary-direct-upload";
import type { ChatMessageKind, ChatUploadTicket } from "@/lib/chat-types";

export type ChatUploadKind = "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

export const CHAT_UPLOAD_LIMITS: Record<ChatUploadKind, number> = {
  IMAGE: 10 * 1024 * 1024,
  VIDEO: 50 * 1024 * 1024,
  AUDIO: 20 * 1024 * 1024,
  FILE: 25 * 1024 * 1024,
};

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "heic",
  "heif",
]);

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v", "ogv"]);

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "m4a",
  "wav",
  "ogg",
  "oga",
  "aac",
  "flac",
  "opus",
  "webm",
  "mp4",
]);

const FILE_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
  "txt",
  "rtf",
  "odt",
  "ods",
  "odp",
  "md",
  "json",
  "xml",
  "zip",
  "7z",
  "rar",
]);

function extensionOf(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function chatAttachmentKind(
  fileName: string,
  mimeType = ""
): ChatUploadKind {
  const extension = extensionOf(fileName);
  const mime = mimeType.toLowerCase();
  // Prefer the MIME type: recorded voice notes arrive as .webm/.mp4 audio and
  // must not be classified as video just because of their container.
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  if (IMAGE_EXTENSIONS.has(extension)) return "IMAGE";
  if (VIDEO_EXTENSIONS.has(extension)) return "VIDEO";
  if (AUDIO_EXTENSIONS.has(extension)) return "AUDIO";
  return "FILE";
}

export function chatUploadLimit(kind: ChatMessageKind | ChatUploadKind) {
  if (kind === "IMAGE" || kind === "VIDEO" || kind === "AUDIO" || kind === "FILE") {
    return CHAT_UPLOAD_LIMITS[kind];
  }
  return CHAT_UPLOAD_LIMITS.FILE;
}

export function isAllowedChatUpload(
  fileName: string,
  kind: ChatUploadKind
) {
  const extension = extensionOf(fileName);
  if (!extension) return false;
  if (kind === "IMAGE") return IMAGE_EXTENSIONS.has(extension);
  if (kind === "VIDEO") return VIDEO_EXTENSIONS.has(extension);
  if (kind === "AUDIO") return AUDIO_EXTENSIONS.has(extension);
  return FILE_EXTENSIONS.has(extension);
}

export function chatUploadResourceType(
  kind: ChatUploadKind
): "image" | "video" | "raw" {
  if (kind === "IMAGE") return "image";
  if (kind === "VIDEO" || kind === "AUDIO") return "video";
  return "raw";
}

export function chatPublicId(
  companyId: string,
  conversationId: string,
  fileName: string,
  resourceType: "image" | "video" | "raw"
) {
  const extension = extensionOf(fileName) || "bin";
  const unique = randomUUID();
  return resourceType === "raw"
    ? `smarthr/chat/${companyId}/${conversationId}/${unique}.${extension}`
    : `smarthr/chat/${companyId}/${conversationId}/${unique}`;
}

export function createChatUploadTicket(
  ticket: ChatUploadTicket,
  secret: string
) {
  return createDirectUploadTicket(ticket, secret);
}

export function readChatUploadTicket(
  token: string,
  secret: string
): ChatUploadTicket | null {
  const ticket = readDirectUploadTicket<ChatUploadTicket>(token, secret);
  if (!ticket || ticket.kind !== "chat") return null;
  return ticket;
}
