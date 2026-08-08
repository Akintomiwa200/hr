import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageDocuments, canViewSharedResource, formatFileSize } from "@/lib/documents/access";
import { shareScopeLabel } from "@/lib/documents/share-groups";
import { PageHeader } from "@/components/ui";
import { FolderDetailModule } from "@/components/documents/folder-detail-module";

export default async function FolderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
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

  const totalSize = folder.documents.reduce((sum, d) => sum + (d.fileSize ?? 0), 0);

  return (
    <div>
      <PageHeader title="Documents" description={folder.description ?? "Folder documents"} />
      <FolderDetailModule
        canManage={canManageDocuments(session)}
        folder={{
          id: folder.id,
          name: folder.name,
          description: folder.description,
          sharedLabel: shareScopeLabel(folder.shareScope, folder.shareTargets),
          documents: folder.documents.map((d) => ({
            id: d.id,
            title: d.title,
            fileName: d.fileName ?? d.title,
            fileUrl: d.fileUrl,
            fileSizeLabel: formatFileSize(d.fileSize),
            uploadedBy: d.uploadedBy,
            createdAt: d.createdAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
