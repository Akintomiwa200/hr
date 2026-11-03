import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, folderCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageDocuments, canViewDocument, canViewDocumentFolder, formatFileSize } from "@/lib/documents/access";
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
    documents: { fileSize: number | null; companyId: string | null; employeeId: string | null; uploadedById: string | null; visibility: string; shareScope: string; shareTargets: string | null }[];
    employeeId?: string | null;
  },
  session?: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  employee?: Awaited<ReturnType<typeof getEmployeeContext>>
) {
  const documents = session
    ? folder.documents.filter((document) => canViewDocument(session, document, employee ?? null, folder))
    : folder.documents;
  const totalSize = documents.reduce((sum, d) => sum + (d.fileSize ?? 0), 0);
  return {
    id: folder.id,
    name: folder.name,
    description: folder.description,
    createdByName: folder.createdByName,
    createdAt: folder.createdAt,
    fileCount: documents.length,
    totalSize,
    totalSizeLabel: formatFileSize(totalSize),
    sharedLabel: folder.employeeId ? "Private employee folder" : shareScopeLabel(folder.shareScope, folder.shareTargets),
    shareScope: folder.employeeId ? "PRIVATE" : folder.shareScope,
    shareTargets: folder.shareTargets,
    employeeId: folder.employeeId ?? null,
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
    include: { documents: { select: { fileSize: true, companyId: true, employeeId: true, uploadedById: true, visibility: true, shareScope: true, shareTargets: true } } },
    orderBy: { name: "asc" },
  });

  const visible = isAdmin
    ? folders
    : folders.filter((f) => canViewDocumentFolder(session, f, employee));

  return NextResponse.json(visible.map((folder) => mapFolder(folder, session, employee)));
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
    include: { documents: { select: { fileSize: true, companyId: true, employeeId: true, uploadedById: true, visibility: true, shareScope: true, shareTargets: true } } },
  });

  broadcastAppEvent("folder_updated", { id: folder.id, action: "created" });
  revalidatePath("/documents");
  return NextResponse.json(mapFolder(folder));
}
