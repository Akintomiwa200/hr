import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, folderCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageDocuments, canViewSharedResource, formatFileSize } from "@/lib/documents/access";
import { shareScopeLabel } from "@/lib/documents/share-groups";

async function getEmployeeContext(session: NonNullable<Awaited<ReturnType<typeof requireSession>>>) {
  if (!session.employeeId) return null;
  return prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
  });
}

function mapFolder(
  folder: {
    id: string;
    name: string;
    description: string | null;
    createdByName: string;
    shareScope: string;
    shareTargets: string | null;
    createdAt: Date;
    documents: { fileSize: number | null }[];
  }
) {
  const totalSize = folder.documents.reduce((sum, d) => sum + (d.fileSize ?? 0), 0);
  return {
    id: folder.id,
    name: folder.name,
    description: folder.description,
    createdByName: folder.createdByName,
    createdAt: folder.createdAt,
    fileCount: folder.documents.length,
    totalSize,
    totalSizeLabel: formatFileSize(totalSize),
    sharedLabel: shareScopeLabel(folder.shareScope, folder.shareTargets),
    shareScope: folder.shareScope,
    shareTargets: folder.shareTargets,
  };
}

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const scope = getCompanyScope(session);
  const employee = await getEmployeeContext(session);
  const isAdmin = canManageDocuments(session);

  const folders = await prisma.documentFolder.findMany({
    where: folderCompanyWhere(scope),
    include: { documents: { select: { fileSize: true } } },
    orderBy: { name: "asc" },
  });

  const visible = isAdmin
    ? folders
    : folders.filter((f) => canViewSharedResource(session, f, employee));

  return NextResponse.json(visible.map(mapFolder));
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManageDocuments(session)) return unauthorized();

  const { name, description } = await request.json();
  if (!name?.trim()) return badRequest("Folder name is required");

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const author = `${session.firstName ?? "User"} ${session.lastName ?? ""}`.trim();

  const folder = await prisma.documentFolder.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      createdByName: author,
      companyId,
      shareScope: "EVERYONE",
    },
    include: { documents: { select: { fileSize: true } } },
  });

  broadcastAppEvent("folder_updated", { id: folder.id, action: "created" });
  revalidatePath("/documents");
  return NextResponse.json(mapFolder(folder));
}
