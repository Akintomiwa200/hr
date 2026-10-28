import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, requireSession, unauthorized } from "@/lib/api-auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { normalizeRole } from "@/lib/roles";

const MAX_BYTES = 2 * 1024 * 1024;

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

function resolveImageMime(file: File) {
  if (file.type.startsWith("image/")) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME_BY_EXTENSION[extension] ?? "";
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const role = normalizeRole(session.role);
  if (role !== "SUPER_ADMIN" && role !== "COMPANY_ADMIN" && role !== "HR") {
    return forbidden();
  }
  if (!session.companyId) return badRequest("No company associated with this account");

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) {
    return badRequest("Choose a logo image to upload");
  }
  if (file.size > MAX_BYTES) {
    return badRequest("Logo must be smaller than 2 MB");
  }
  const mimeType = resolveImageMime(file);
  if (!mimeType) {
    return badRequest("Logo must be an image file (PNG, JPG, SVG)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicId = ["smarthr", "company", session.companyId, "logo"].join("/");

  let url: string;
  try {
    const uploaded = await uploadToCloudinary({
      buffer,
      filename: file.name,
      mimeType,
      publicId,
      resourceType: "image",
    });
    url = uploaded.url;
  } catch {
    // If Cloudinary is not configured or fails, store the logo as a data URI so
    // the upload still succeeds (same fallback used for profile photos).
    url = `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  await prisma.company.update({
    where: { id: session.companyId },
    data: { logo: url },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/company");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  broadcastAppEvent("settings_updated", { companyId: session.companyId });
  return NextResponse.json({ success: true, logo: url });
}
