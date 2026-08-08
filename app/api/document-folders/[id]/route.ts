import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { serializeShareTargets } from "@/lib/documents/share-groups";
import { canManageDocuments, canViewSharedResource, formatFileSize } from "@/lib/documents/access";
import { shareScopeLabel } from "@/lib/documents/share-groups";

async function getEmployeeContext(session: NonNullable<Awaited<ReturnType<typeof requireSession>>>) {
  if (!session.employeeId) return null;
  return prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const folder = await prisma.documentFolder.findUnique({
    where: { id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!folder) return notFound();

  const employee = await getEmployeeContext(session);
  if (!canManageDocuments(session) && !canViewSharedResource(session, folder, employee)) {
    return unauthorized();
  }

  const totalSize = folder.documents.reduce((sum, d) => sum + (d.fileSize ?? 0), 0);

  return NextResponse.json({
    id: folder.id,
    name: folder.name,
    description: folder.description,
    createdByName: folder.createdByName,
    createdAt: folder.createdAt,
    shareScope: folder.shareScope,
    shareTargets: folder.shareTargets,
    sharedLabel: shareScopeLabel(folder.shareScope, folder.shareTargets),
    fileCount: folder.documents.length,
    totalSizeLabel: formatFileSize(totalSize),
    documents: folder.documents.map((d) => ({
      id: d.id,
      title: d.title,
      fileName: d.fileName ?? d.title,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      fileSizeLabel: formatFileSize(d.fileSize),
      uploadedBy: d.uploadedBy,
      createdAt: d.createdAt,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageDocuments(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.documentFolder.findUnique({ where: { id } });
  if (!existing) return notFound();

  const folder = await prisma.documentFolder.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.shareScope !== undefined && { shareScope: body.shareScope }),
      ...(body.shareTargets !== undefined && {
        shareTargets: serializeShareTargets(
          Array.isArray(body.shareTargets) ? body.shareTargets : []
        ),
      }),
    },
  });

  broadcastAppEvent("folder_updated", { id, action: "updated" });
  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  return NextResponse.json(folder);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageDocuments(session)) return unauthorized();

  const { id } = await params;
  const existing = await prisma.documentFolder.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.documentFolder.delete({ where: { id } });
  broadcastAppEvent("folder_updated", { id, action: "deleted" });
  revalidatePath("/documents");
  return NextResponse.json({ success: true });
}
