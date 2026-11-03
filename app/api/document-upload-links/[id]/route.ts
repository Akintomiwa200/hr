import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope } from "@/lib/company-scope";
import { canManageDocuments } from "@/lib/documents/access";
import { canManageChecklists } from "@/lib/checklist/access";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || (!canManageDocuments(session) && !canManageChecklists(session))) {
    return unauthorized();
  }

  const { id } = await params;
  const scope = getCompanyScope(session);
  const link = await prisma.documentUploadLink.findFirst({
    where: { id, ...(scope.companyId ? { companyId: scope.companyId } : {}) },
  });
  if (!link) return notFound();

  const updated = await prisma.documentUploadLink.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  broadcastAppEvent("folder_updated", {
    id: link.folderId,
    employeeId: link.employeeId,
    action: "upload_link_revoked",
  });
  revalidatePath("/documents");
  revalidatePath(`/documents/${link.folderId}`);

  return NextResponse.json({ id: updated.id, revokedAt: updated.revokedAt });
}
