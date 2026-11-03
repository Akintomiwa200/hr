import crypto from "crypto";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  // Prefer an explicitly configured credential set over CLOUDINARY_URL. This
  // avoids a stale URL shadowing valid credentials in local and hosted envs.
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };

  const url = process.env.CLOUDINARY_URL?.trim();
  if (url?.startsWith("cloudinary://")) {
    try {
      const parsed = new URL(url);
      if (parsed.username && parsed.password && parsed.hostname) {
        return {
          cloudName: parsed.hostname,
          apiKey: decodeURIComponent(parsed.username),
          apiSecret: decodeURIComponent(parsed.password),
        };
      }
    } catch {
      // Fall through to the explicit Cloudinary variables. Some deployments
      // keep a stale or malformed CLOUDINARY_URL alongside valid credentials.
    }
  }

  return null;
}

function sign(params: Record<string, string | number>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

export function signCloudinaryUploadParams(params: Record<string, string | number>, apiSecret: string) {
  return sign(params, apiSecret);
}

type CloudinaryUploadInput = {
  buffer: Buffer;
  filename: string;
  mimeType?: string | null;
  publicId: string;
  resourceType?: "auto" | "image" | "raw";
};

export async function uploadToCloudinary(input: CloudinaryUploadInput) {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const resourceType = input.resourceType ?? "auto";
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signs all upload parameters EXCEPT file, cloud_name, api_key,
  // resource_type and signature — resource_type is implied by the upload endpoint.
  const params: Record<string, string | number> = { public_id: input.publicId, timestamp };
  const signature = sign(params, config.apiSecret);

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType || undefined }),
    input.filename
  );
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("public_id", input.publicId);
  if (resourceType !== "auto") form.append("resource_type", resourceType);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    { method: "POST", body: form }
  );
  const data = (await res.json()) as {
    secure_url?: string;
    url?: string;
    public_id?: string;
    bytes?: number;
    resource_type?: "image" | "raw" | "video";
    error?: { message?: string };
  };
  if (!res.ok || (!data.secure_url && !data.url)) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  return {
    url: data.secure_url || data.url!,
    publicId: data.public_id || input.publicId,
    bytes: data.bytes ?? input.buffer.length,
    resourceType: data.resource_type || resourceType,
  };
}

export async function uploadChecklistFileToCloudinary(input: {
  buffer: Buffer;
  filename: string;
  mimeType?: string | null;
  publicId: string;
}) {
  // Cloudinary's auto mode normally recognizes PDFs, but make their image
  // resource type explicit so page previews can be transformed to JPG even
  // when delivery of original PDF files is blocked by account settings.
  const extension = input.filename.split(".").pop()?.toLowerCase() ?? "";
  const resourceType = input.mimeType?.toLowerCase() === "application/pdf" || ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff", "svg", "heic", "heif"].includes(extension)
    ? "image"
    : "raw";
  const publicId = resourceType === "raw" && !input.publicId.toLowerCase().endsWith(`.${extension}`)
    ? `${input.publicId}.${extension}`
    : input.publicId;
  return uploadToCloudinary({ ...input, publicId, resourceType });
}

export async function uploadJsonToCloudinary(input: {
  data: unknown;
  publicId: string;
}) {
  const buffer = Buffer.from(JSON.stringify(input.data), "utf8");
  return uploadToCloudinary({
    buffer,
    filename: "data.json",
    mimeType: "application/json",
    publicId: input.publicId,
    resourceType: "raw",
  });
}

export async function uploadAttendancePhotoToCloudinary(input: {
  buffer: Buffer;
  filename: string;
  mimeType?: string | null;
  companyId: string;
  employeeId: string;
  kind: "check-in" | "check-out";
}) {
  const publicId = [
    "smarthr",
    "attendance",
    input.companyId,
    input.employeeId,
    `${input.kind}-${Date.now()}`,
  ].join("/");
  return uploadToCloudinary({
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
    publicId,
    resourceType: "image",
  });
}

export async function deleteCloudinaryFile(
  publicId: string,
  resourceType: "image" | "raw" = "image"
) {
  const config = getCloudinaryConfig();
  if (!config) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ public_id: publicId, timestamp }, config.apiSecret);
  const form = new FormData();
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("public_id", publicId);
  await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`,
    { method: "POST", body: form }
  ).catch(() => undefined);
}
