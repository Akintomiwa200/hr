import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDocumentFolderModelReady, prisma } from "@/lib/prisma";
import { getCompanyScope, folderCompanyWhere } from "@/lib/company-scope";
import { canManageDocuments, canViewSharedResource, formatFileSize } from "@/lib/documents/access";
import { shareScopeLabel } from "@/lib/documents/share-groups";
import { Card, PageHeader } from "@/components/ui";
import { DocumentsModule } from "@/components/documents/documents-module";
import { HelpLink } from "@/components/help/help-link";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { canViewEmployee } from "@/lib/employee-access";

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
  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
      })
    : null;

  const [foldersRaw, departments] = await Promise.all([
    prisma.documentFolder.findMany({
      where: {
        ...folderCompanyWhere(scope),
        ...(employeeId ? { documents: { some: { employeeId } } } : {}),
      },
      include: { documents: { select: { fileSize: true, employeeId: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: scope.companyId ? { companyId: scope.companyId } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const isAdmin = canManageDocuments(session);
  const folders = (isAdmin ? foldersRaw : foldersRaw.filter((f) => canViewSharedResource(session, f, employee))).map(
    (folder) => {
      const folderDocuments = employeeId ? folder.documents.filter((d) => d.employeeId === employeeId) : folder.documents;
      const totalSize = folderDocuments.reduce((sum, d) => sum + (d.fileSize ?? 0), 0);
      return {
        id: folder.id,
        name: folder.name,
        description: folder.description,
        createdByName: folder.createdByName,
        createdAt: folder.createdAt,
        fileCount: folderDocuments.length,
        totalSizeLabel: formatFileSize(totalSize),
        sharedLabel: shareScopeLabel(folder.shareScope, folder.shareTargets),
        shareScope: folder.shareScope,
        shareTargets: folder.shareTargets,
      };
    }
  );

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
      <DocumentsModule folders={folders} canManage={isAdmin} departments={departments} employeeId={employeeId} />
      <PageLiveRefresh types={["document_updated", "folder_updated"]} />
    </div>
  );
}
