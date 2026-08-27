import crypto from "crypto";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const url = process.env.CLOUDINARY_URL;
  if (url?.startsWith("cloudinary://")) {
    try {
      const parsed = new URL(url);
      if (parsed.username && parsed.password && parsed.hostname) {
        return {
          cloudName: parsed.hostname,
          apiKey: parsed.username,
          apiSecret: parsed.password,
        };
      }
    } catch {
      return null;
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function sign(params: Record<string, string | number>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

export async function uploadChecklistFileToCloudinary(input: {
  buffer: Buffer;
  filename: string;
  mimeType?: string | null;
  publicId: string;
}) {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: input.publicId, timestamp };
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

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as {
    secure_url?: string;
    url?: string;
    public_id?: string;
    bytes?: number;
    error?: { message?: string };
  };
  if (!res.ok || (!data.secure_url && !data.url)) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  return {
    url: data.secure_url || data.url!,
    publicId: data.public_id || input.publicId,
    bytes: data.bytes ?? input.buffer.length,
  };
}

export async function deleteCloudinaryFile(publicId: string) {
  const config = getCloudinaryConfig();
  if (!config) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ public_id: publicId, timestamp }, config.apiSecret);
  const form = new FormData();
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("public_id", publicId);
  await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    method: "POST",
    body: form,
  }).catch(() => undefined);
}
