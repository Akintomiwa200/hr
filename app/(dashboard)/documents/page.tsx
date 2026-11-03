import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDocumentFolderModelReady, prisma } from "@/lib/prisma";
import { getCompanyScope, folderCompanyWhere } from "@/lib/company-scope";
import { canManageDocuments, canViewDocument, canViewDocumentFolder, formatFileSize } from "@/lib/documents/access";
import { shareScopeLabel } from "@/lib/documents/share-groups";
import { Card, PageHeader } from "@/components/ui";
import { DocumentsModule } from "@/components/documents/documents-module";
import { HelpLink } from "@/components/help/help-link";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { canViewEmployee } from "@/lib/employee-access";
import { EmployeeDocumentsList } from "@/components/documents/employee-documents-list";
import { syncChecklistTaskDocuments } from "@/lib/checklist/task-documents";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ employeeId?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { employeeId } = await searchParams;
  if (employeeId && !(await canViewEmployee(session, employeeId))) notFound();
  if (employeeId && session.employeeId !== employeeId && !canManageDocuments(session)) notFound();

  if (!isDocumentFolderModelReady()) {
    return (
      <div>
        <PageHeader title="Documents" description="Company policies, contracts, and shared folders" />
        <Card className="p-6 text-sm text-gray-600">
          Document folders are not available yet. Stop the dev server, run{" "}
          <code className="bg-gray-100 px-1 rounded">npx prisma generate</code>, then restart.
        </Card>
      </div>
    );
  }

  const scope = getCompanyScope(session);
  if (employeeId) await syncChecklistTaskDocuments(scope.companyId, employeeId);
  else if (canManageDocuments(session)) await syncChecklistTaskDocuments(scope.companyId);
  else if (session.employeeId) await syncChecklistTaskDocuments(scope.companyId, session.employeeId);
  if (employeeId) {
    const documents = await prisma.document.findMany({
      where: { employeeId, ...(scope.companyId ? { companyId: scope.companyId } : scope.isPlatformAdmin ? {} : { companyId: "__none__" }) },
      include: {
        folder: { select: { id: true, name: true, shareScope: true, shareTargets: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const employeeContext = session.employeeId
      ? await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true } })
      : null;
    const visible = documents.filter((document) => canViewDocument(session, document, employeeContext, document.folder));
    return <div><PageHeader title="Employee Documents" description="Uploaded files attached to this employee" /><EmployeeDocumentsList documents={visible.map((document) => ({ id: document.id, title: document.title, fileName: document.fileName ?? document.title, fileSizeLabel: formatFileSize(document.fileSize), uploadedBy: document.uploadedBy, createdAt: document.createdAt.toISOString(), visibility: document.visibility, folderName: document.folder?.name ?? "Unfiled" }))} employeeId={employeeId} /><PageLiveRefresh types={["document_updated", "folder_updated"]} /></div>;
  }
  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
      })
    : null;

  const [foldersRaw, departments, employees] = await Promise.all([
    prisma.documentFolder.findMany({
      where: folderCompanyWhere(scope),
        include: { documents: { select: { fileSize: true, employeeId: true, companyId: true, uploadedById: true, visibility: true, shareScope: true, shareTargets: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: scope.companyId ? { companyId: scope.companyId } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    canManageDocuments(session)
      ? prisma.employee.findMany({
          where: scope.companyId ? { user: { companyId: scope.companyId } } : {},
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const isAdmin = canManageDocuments(session);
  const folderById = new Map(foldersRaw.map((folder) => [folder.id, folder]));
  const descendantsOf = (rootId: string) => {
    const ids = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (ids.has(id)) continue;
      ids.add(id);
      for (const folder of foldersRaw) {
        if (folder.parentId === id) queue.push(folder.id);
      }
    }
    return ids;
  };

  // Keep ancestors visible when an employee filter matches a subfolder only.
  let scopedFolders = foldersRaw;
  if (employeeId) {
    const matching = new Set(
      foldersRaw
        .filter(
          (folder) =>
            folder.employeeId === employeeId || folder.documents.some((document) => document.employeeId === employeeId)
        )
        .map((folder) => folder.id)
    );
    for (const id of [...matching]) {
      let current = folderById.get(id);
      while (current?.parentId) {
        matching.add(current.parentId);
        current = folderById.get(current.parentId);
      }
    }
    scopedFolders = foldersRaw.filter((folder) => matching.has(folder.id));
  }

  if (!isAdmin && session.employeeId) {
    const visibleIds = new Set(scopedFolders.map((folder) => folder.id));
    for (const folder of scopedFolders) {
      if (folder.employeeId !== session.employeeId) continue;
      visibleIds.add(folder.id);
      let current = folder;
      while (current.parentId) {
        visibleIds.add(current.parentId);
        const parent = folderById.get(current.parentId);
        if (!parent) break;
        current = parent;
      }
    }
    scopedFolders = scopedFolders.filter((folder) => visibleIds.has(folder.id));
  }

  const folders = (isAdmin ? scopedFolders : scopedFolders.filter((f) => canViewDocumentFolder(session, f, employee)))
    .filter((folder) => !folder.parentId)
    .map((folder) => {
      const descendantIds = descendantsOf(folder.id);
      const folderDocuments = foldersRaw
        .filter((item) => descendantIds.has(item.id))
        .flatMap((item) => item.documents.map((document) => ({ document, folder: item })))
        .filter(({ document, folder: documentFolder }) =>
          (!employeeId || document.employeeId === employeeId) &&
          canViewDocument(session, document, employee, documentFolder)
        )
        .map(({ document }) => document);
      const totalSize = folderDocuments.reduce((sum, d) => sum + (d.fileSize ?? 0), 0);
      const subfolderCount = foldersRaw.filter((item) => item.parentId === folder.id && canViewDocumentFolder(session, item, employee)).length;
      return {
        id: folder.id,
        name: folder.name,
        description: folder.description,
        createdByName: folder.createdByName,
        createdAt: folder.createdAt,
        fileCount: folderDocuments.length,
        totalSizeLabel: formatFileSize(totalSize),
        sharedLabel: folder.employeeId ? "Private employee folder" : shareScopeLabel(folder.shareScope, folder.shareTargets),
        shareScope: folder.employeeId ? "PRIVATE" : folder.shareScope,
        shareTargets: folder.shareTargets,
        employeeId: folder.employeeId,
        subfolderCount,
      };
    });

  return (
    <div>
      <PageHeader
        title="Documents"
        description={
          employeeId
            ? "Employee files — folders containing this employee’s documents"
            : isAdmin
            ? "Company policies, contracts, and shared folders"
            : "Shared company documents available to you"
        }
        action={<HelpLink slug="documents" label="Documents guide" />}
      />
      <DocumentsModule folders={folders} canManage={isAdmin} departments={departments} employees={employees} employeeId={employeeId} />
      <PageLiveRefresh types={["document_updated", "folder_updated"]} />
    </div>
  );
}
