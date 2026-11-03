import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageDocuments, canViewDocumentFolder, formatFileSize } from "@/lib/documents/access";
import { shareScopeLabel } from "@/lib/documents/share-groups";
import { PageHeader } from "@/components/ui";
import { FolderDetailModule } from "@/components/documents/folder-detail-module";
import { canViewDocument } from "@/lib/documents/access";
import { getCompanyScope } from "@/lib/company-scope";

export default async function FolderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [{ id }, { employeeId }] = await Promise.all([params, searchParams]);
  const folder = await prisma.documentFolder.findUnique({
    where: { id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!folder) notFound();
  const companyScope = getCompanyScope(session);
  if (!companyScope.isPlatformAdmin && folder.companyId !== companyScope.companyId) notFound();

  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
      })
    : null;

  if (!canViewDocumentFolder(session, folder, employee)) {
    redirect("/documents");
  }

  const [companyEmployees, childFolders] = await Promise.all([
    prisma.employee.findMany({
      where: { status: "ACTIVE", user: { companyId: session.companyId ?? undefined } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.documentFolder.findMany({
      where: { parentId: folder.id },
      include: { documents: { select: { id: true, fileSize: true, companyId: true, employeeId: true, uploadedById: true, visibility: true, shareScope: true, shareTargets: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const visibleDocuments = folder.documents.filter((document) =>
    canViewDocument(session, document, employee, folder) && (!employeeId || document.employeeId === employeeId)
  );

  // Walk up the folder tree so HR can see the full storage path.
  const path: Array<{ id: string; name: string }> = [];
  let cursor: { id: string; name: string; parentId: string | null } | null = {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
  };
  for (let depth = 0; cursor && depth < 20; depth += 1) {
    path.unshift({ id: cursor.id, name: cursor.name });
    cursor = cursor.parentId
      ? await prisma.documentFolder.findUnique({
          where: { id: cursor.parentId },
          select: { id: true, name: true, parentId: true },
        })
      : null;
  }

  return (
    <div>
      <PageHeader title="Documents" description={folder.description ?? "Folder documents"} />
      <FolderDetailModule
        canManage={canManageDocuments(session)}
        employees={companyEmployees}
        employeeFilterId={employeeId}
        folder={{
          id: folder.id,
          name: folder.name,
          description: folder.description,
          employeeId: folder.employeeId,
          path,
          subfolders: childFolders.filter((child) => canViewDocumentFolder(session, child, employee)).map((child) => ({
            id: child.id,
            name: child.name,
            fileCount: child.documents.filter((document) => canViewDocument(session, document, employee, child)).length,
          })),
          sharedLabel: folder.employeeId ? "Private employee folder" : shareScopeLabel(folder.shareScope, folder.shareTargets),
          documents: visibleDocuments.map((d) => ({
            id: d.id,
            title: d.title,
            fileName: d.fileName ?? d.title,
            fileUrl: d.publicId ? `/api/documents/${d.id}/file` : d.fileUrl,
            fileSizeLabel: formatFileSize(d.fileSize),
            uploadedBy: d.uploadedBy,
            createdAt: d.createdAt.toISOString(),
            visibility: d.visibility,
          })),
        }}
      />
    </div>
  );
}
