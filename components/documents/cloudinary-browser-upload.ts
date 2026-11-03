"use client";

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  bytes: number;
};

export function uploadCloudinaryFile(input: {
  uploadUrl: string;
  params: Record<string, string | number>;
  file: File;
  onProgress?: (percent: number) => void;
}) {
  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", input.uploadUrl);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) input.onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Network error while uploading to Cloudinary."));
    request.onabort = () => reject(new Error("Upload was cancelled."));
    request.onload = () => {
      let result: CloudinaryUploadResult & { error?: { message?: string } };
      try {
        result = JSON.parse(request.responseText || "{}") as typeof result;
      } catch {
        reject(new Error("Cloudinary returned an unreadable upload response."));
        return;
      }
      if (request.status < 200 || request.status >= 300 || !result.secure_url) {
        reject(new Error(result.error?.message || `Cloudinary upload failed (${request.status}).`));
        return;
      }
      resolve(result);
    };
    const form = new FormData();
    form.append("file", input.file, input.file.name);
    for (const [key, value] of Object.entries(input.params)) form.append(key, String(value));
    request.send(form);
  });
}
