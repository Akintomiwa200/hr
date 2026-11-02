import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageDocuments, canViewSharedResource, formatFileSize } from "@/lib/documents/access";
import { shareScopeLabel } from "@/lib/documents/share-groups";
import { PageHeader } from "@/components/ui";
import { FolderDetailModule } from "@/components/documents/folder-detail-module";
import { canViewDocument } from "@/lib/documents/access";

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

  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
      })
    : null;

  if (!canManageDocuments(session) && !canViewSharedResource(session, folder, employee)) {
    redirect("/documents");
  }

  const companyEmployees = await prisma.employee.findMany({
    where: { status: "ACTIVE", user: { companyId: session.companyId ?? undefined } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });
  const visibleDocuments = folder.documents.filter((document) =>
    canViewDocument(session, document, employee, folder) && (!employeeId || document.employeeId === employeeId)
  );

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
          sharedLabel: shareScopeLabel(folder.shareScope, folder.shareTargets),
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
