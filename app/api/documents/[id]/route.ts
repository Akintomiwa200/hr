import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.document.delete({ where: { id } });
  broadcastAppEvent("document_updated", { id, action: "deleted" });
  if (existing.folderId) {
    broadcastAppEvent("folder_updated", { id: existing.folderId, action: "file_removed" });
    revalidatePath(`/documents/${existing.folderId}`);
  }
  revalidatePath("/documents");
  return NextResponse.json({ success: true });
}
