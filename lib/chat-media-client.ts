"use client";

import { uploadCloudinaryFile } from "@/components/documents/cloudinary-browser-upload";

const MAX_IMAGE_EDGE = 1600;
const COMPRESS_THRESHOLD_BYTES = 1.2 * 1024 * 1024;
const JPEG_QUALITY = 0.82;

function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Shrink large photos before upload so chat media stays cheap to store and
 * quick to send. Animated/vector formats are left untouched.
 */
export async function compressChatImage(file: File): Promise<File> {
  const extension = extensionOf(file.name);
  if (!file.type.startsWith("image/") || ["gif", "svg"].includes(extension)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale =
      longestEdge > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / longestEdge : 1;

    if (scale === 1 && file.size <= COMPRESS_THRESHOLD_BYTES) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export type ChatUploadProgress = (percent: number) => void;

/**
 * Ask the server for a signed ticket, upload straight to Cloudinary, and hand
 * the result back so the caller can post the chat message metadata.
 */
export async function uploadChatAttachment(input: {
  conversationId: string;
  file: File;
  onProgress?: ChatUploadProgress;
}) {
  const signRes = await fetch("/api/chat/upload-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: input.conversationId,
      fileName: input.file.name,
      fileSize: input.file.size,
      mimeType: input.file.type || "application/octet-stream",
    }),
  });
  if (!signRes.ok) {
    const data = (await signRes.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error || "Could not prepare that upload.");
  }

  const signed = (await signRes.json()) as {
    ticket?: string;
    uploadUrl?: string;
    params?: Record<string, string | number>;
  };
  if (!signed.ticket || !signed.uploadUrl || !signed.params) {
    throw new Error("Could not prepare that upload.");
  }

  const result = await uploadCloudinaryFile({
    uploadUrl: signed.uploadUrl,
    params: signed.params,
    file: input.file,
    onProgress: input.onProgress,
  });

  return {
    ticket: signed.ticket,
    secureUrl: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    bytes: result.bytes,
  };
}

/** Record a short voice note with MediaRecorder when the browser supports it. */
export function createVoiceRecorder() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return null;
  }

  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  const chunks: BlobPart[] = [];

  function pickMimeType() {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
  }

  async function start() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMimeType();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks.length = 0;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.start();
  }

  function stop() {
    return new Promise<File>((resolve, reject) => {
      if (!recorder) {
        reject(new Error("Recorder was not started."));
        return;
      }
      recorder.onstop = () => {
        const mimeType = recorder?.mimeType || "audio/webm";
        const extension = mimeType.includes("mp4")
          ? "m4a"
          : mimeType.includes("ogg")
            ? "ogg"
            : "webm";
        const blob = new Blob(chunks, { type: mimeType });
        cleanup();
        if (blob.size === 0) {
          reject(new Error("Nothing was recorded."));
          return;
        }
        resolve(
          new File([blob], `voice-note.${extension}`, {
            type: mimeType,
            lastModified: Date.now(),
          })
        );
      };
      recorder.stop();
    });
  }

  function cleanup() {
    recorder = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    chunks.length = 0;
  }

  function cancel() {
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      // Ignore stop errors while cancelling.
    }
    cleanup();
  }

  return { start, stop, cancel };
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
