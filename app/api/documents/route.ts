import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageDocuments, canViewSharedResource } from "@/lib/documents/access";

async function getEmployeeContext(session: NonNullable<Awaited<ReturnType<typeof requireSession>>>) {
  if (!session.employeeId) return null;
  return prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
  });
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const folderId = request.nextUrl.searchParams.get("folderId");
  const employee = await getEmployeeContext(session);
  const isAdmin = canManageDocuments(session);

  const whereClause = folderId
    ? { folderId }
    : session.role === "EMPLOYEE" && session.employeeId
      ? { OR: [{ employeeId: null }, { employeeId: session.employeeId }] }
      : {};

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: { employee: true, folder: true },
    orderBy: { createdAt: "desc" },
  });

  const visible = isAdmin
    ? documents
    : documents.filter((d) => {
        if (d.folder && !canViewSharedResource(session, d.folder, employee)) return false;
        if (d.employeeId && d.employeeId !== session.employeeId) return false;
        return canViewSharedResource(session, d, employee);
      });

  return NextResponse.json(visible);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { title, category, fileUrl, fileName, fileSize, employeeId, folderId } = await request.json();
  if (!title?.trim()) return badRequest("Title is required");

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const author = `${session.firstName ?? "User"} ${session.lastName ?? ""}`.trim();

  if (folderId) {
    const folder = await prisma.documentFolder.findUnique({ where: { id: folderId } });
    if (!folder) return badRequest("Folder not found");
  }

  const document = await prisma.document.create({
    data: {
      title: title.trim(),
      category: category?.trim() || "General",
      fileUrl: fileUrl?.trim() || null,
      fileName: fileName?.trim() || title.trim(),
      fileSize: fileSize ? Number(fileSize) : null,
      employeeId: employeeId || null,
      folderId: folderId || null,
      companyId,
      uploadedBy: author,
    },
    include: { employee: true, folder: true },
  });

  broadcastAppEvent("document_updated", { id: document.id, folderId: document.folderId });
  if (folderId) broadcastAppEvent("folder_updated", { id: folderId, action: "file_added" });
  revalidatePath("/documents");
  if (folderId) revalidatePath(`/documents/${folderId}`);
  return NextResponse.json(document);
}
