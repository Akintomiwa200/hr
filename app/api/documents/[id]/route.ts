import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { deleteCloudinaryFile } from "@/lib/cloudinary";
import { canManageDocuments } from "@/lib/documents/access";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageDocuments(session)) return unauthorized();
  const { id } = await params;
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return notFound();
  const body = await request.json().catch(() => null);
  if (!["PRIVATE", "PUBLIC", "PROTECTED"].includes(body?.visibility)) {
    return badRequest("Choose private, public, or protected visibility.");
  }
  const data: { visibility: string; protectionHash: string | null } = { visibility: body.visibility, protectionHash: null };
  if (body.visibility === "PROTECTED") {
    if (typeof body.protectionPin !== "string" || body.protectionPin.length < 4 || body.protectionPin.length > 128) {
      return badRequest("Protected files need a PIN or password between 4 and 128 characters.");
    }
    data.protectionHash = await bcrypt.hash(body.protectionPin, 10);
  }
  const updated = await prisma.document.update({ where: { id }, data });
  broadcastAppEvent("document_updated", { id, folderId: updated.folderId, action: "visibility_changed" });
  revalidatePath("/documents");
  if (updated.folderId) revalidatePath(`/documents/${updated.folderId}`);
  return NextResponse.json({ success: true, visibility: updated.visibility });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageDocuments(session)) return unauthorized();

  const { id } = await params;
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.document.delete({ where: { id } });
  if (existing.publicId && (existing.storageType === "image" || existing.storageType === "raw")) {
    await deleteCloudinaryFile(existing.publicId, existing.storageType);
  }
  broadcastAppEvent("document_updated", { id, action: "deleted" });
  if (existing.folderId) {
    broadcastAppEvent("folder_updated", { id: existing.folderId, action: "file_removed" });
    revalidatePath(`/documents/${existing.folderId}`);
  }
  revalidatePath("/documents");
  return NextResponse.json({ success: true });
}
