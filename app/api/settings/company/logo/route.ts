import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, requireSession, unauthorized } from "@/lib/api-auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { normalizeRole } from "@/lib/roles";

const MAX_BYTES = 2 * 1024 * 1024;

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
  if (!file.type.startsWith("image/")) {
    return badRequest("Logo must be an image file (PNG, JPG, SVG)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicId = ["smarthr", "company", session.companyId, "logo"].join("/");

  let url: string;
  try {
    const uploaded = await uploadToCloudinary({
      buffer,
      filename: file.name,
      mimeType: file.type,
      publicId,
      resourceType: "image",
    });
    url = uploaded.url;
  } catch {
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 }
    );
  }

  await prisma.company.update({
    where: { id: session.companyId },
    data: { logo: url },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  broadcastAppEvent("settings_updated", { companyId: session.companyId });
  return NextResponse.json({ success: true, logo: url });
}
