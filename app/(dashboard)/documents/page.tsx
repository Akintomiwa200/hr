import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageOrgContent } from "@/lib/roles";
import { isDocumentFolderModelReady, prisma } from "@/lib/prisma";
import { getCompanyScope, folderCompanyWhere } from "@/lib/company-scope";
import { canManageDocuments, canViewSharedResource, formatFileSize } from "@/lib/documents/access";
import { shareScopeLabel } from "@/lib/documents/share-groups";
import { Card, PageHeader } from "@/components/ui";
import { DocumentsModule } from "@/components/documents/documents-module";
import { HelpLink } from "@/components/help/help-link";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageOrgContent(session.role)) redirect("/dashboard");

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
      where: folderCompanyWhere(scope),
      include: { documents: { select: { fileSize: true } } },
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
      const totalSize = folder.documents.reduce((sum, d) => sum + (d.fileSize ?? 0), 0);
      return {
        id: folder.id,
        name: folder.name,
        description: folder.description,
        createdByName: folder.createdByName,
        createdAt: folder.createdAt,
        fileCount: folder.documents.length,
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
        description="Company policies, contracts, and shared folders"
        action={<HelpLink slug="documents" label="Documents guide" />}
      />
      <DocumentsModule folders={folders} canManage={isAdmin} departments={departments} />
    </div>
  );
}
