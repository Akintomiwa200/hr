import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { deleteCloudinaryFile, uploadToCloudinary } from "@/lib/cloudinary";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

const MAX_BYTES = 2 * 1024 * 1024;

function avatarPublicId(id: string) {
  return ["smarthr", "avatars", id].join("/");
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

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
  const targetId = session.employeeId || session.id;
  const publicId = avatarPublicId(targetId);

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
    // If Cloudinary is not configured or fails, store as base64 data URI so avatars always work
    url = `data:${file.type};base64,${buffer.toString("base64")}`;
  }

  // Update employee avatar if account is linked to an employee
  if (session.employeeId) {
    await prisma.employee.update({
      where: { id: session.employeeId },
      data: { avatar: url },
    });
    broadcastAppEvent("employee_updated", { employeeId: session.employeeId });
  }

  // Also persist avatar in User preferences so Super Admin and User profile is synced
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { preferences: true },
  });
  let prefs: Record<string, unknown> = {};
  if (user?.preferences) {
    try {
      prefs = JSON.parse(user.preferences);
    } catch {
      prefs = {};
    }
  }
  prefs.avatar = url;
  await prisma.user.update({
    where: { id: session.id },
    data: { preferences: JSON.stringify(prefs) },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  revalidatePath("/");
  broadcastAppEvent("settings_updated", { userId: session.id });

  return NextResponse.json({ success: true, avatar: url });
}

export async function DELETE() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const targetId = session.employeeId || session.id;

  try {
    await deleteCloudinaryFile(avatarPublicId(targetId), "image");
  } catch {
    // Ignore Cloudinary delete errors if file was local/data-uri or not found
  }

  if (session.employeeId) {
    await prisma.employee.update({
      where: { id: session.employeeId },
      data: { avatar: null },
    });
    broadcastAppEvent("employee_updated", { employeeId: session.employeeId });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { preferences: true },
  });
  let prefs: Record<string, unknown> = {};
  if (user?.preferences) {
    try {
      prefs = JSON.parse(user.preferences);
    } catch {
      prefs = {};
    }
  }
  delete prefs.avatar;
  await prisma.user.update({
    where: { id: session.id },
    data: { preferences: JSON.stringify(prefs) },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  revalidatePath("/");
  broadcastAppEvent("settings_updated", { userId: session.id });

  return NextResponse.json({ success: true });
}