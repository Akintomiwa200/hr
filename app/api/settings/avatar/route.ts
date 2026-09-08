import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { deleteCloudinaryFile, uploadToCloudinary } from "@/lib/cloudinary";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

const MAX_BYTES = 2 * 1024 * 1024;

function avatarPublicId(employeeId: string) {
  return ["smarthr", "avatars", employeeId].join("/");
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!session.employeeId) {
    return badRequest("No employee profile is linked to this account");
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) {
    return badRequest("Choose a profile photo to upload");
  }
  if (file.size > MAX_BYTES) {
    return badRequest("Photo must be smaller than 2 MB");
  }
  if (!file.type.startsWith("image/")) {
    return badRequest("Photo must be an image file (PNG, JPG, WEBP)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicId = avatarPublicId(session.employeeId);

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
      { error: "Photo upload failed. Please try again." },
      { status: 500 }
    );
  }

  await prisma.employee.update({
    where: { id: session.employeeId },
    data: { avatar: url },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/");
  broadcastAppEvent("employee_updated", { employeeId: session.employeeId });
  return NextResponse.json({ success: true, avatar: url });
}

export async function DELETE() {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!session.employeeId) {
    return badRequest("No employee profile is linked to this account");
  }

  await deleteCloudinaryFile(avatarPublicId(session.employeeId), "image");

  await prisma.employee.update({
    where: { id: session.employeeId },
    data: { avatar: null },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/");
  broadcastAppEvent("employee_updated", { employeeId: session.employeeId });
  return NextResponse.json({ success: true });
}