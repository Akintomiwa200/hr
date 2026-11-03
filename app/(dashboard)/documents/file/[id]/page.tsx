import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope } from "@/lib/company-scope";
import { canManageDocuments, canViewDocument, formatFileSize } from "@/lib/documents/access";
import { PageHeader } from "@/components/ui";
import { DocumentPreview } from "@/components/documents/document-preview";

export default async function EmployeeDocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ employeeId?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const [{ id }, { employeeId }] = await Promise.all([params, searchParams]);
  const scope = getCompanyScope(session);
  const document = await prisma.document.findUnique({ where: { id }, include: { folder: true } });
  if (!document || (scope.companyId ? document.companyId !== scope.companyId : !scope.isPlatformAdmin && document.companyId !== null)) notFound();
  if (employeeId && document.employeeId !== employeeId) notFound();
  if (!employeeId && !canManageDocuments(session) && document.employeeId !== session.employeeId) notFound();
  const employee = session.employeeId ? await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true } }) : null;
  if (!canViewDocument(session, document, employee, document.folder)) notFound();
  const back = employeeId ? `/documents?employeeId=${employeeId}` : "/documents";
  return <div><PageHeader title={document.title} description={`${document.fileName ?? document.title} · ${formatFileSize(document.fileSize)}`} /><Link href={back} className="mb-4 inline-block text-sm text-brand-600 hover:underline">← Back to employee documents</Link><DocumentPreview documentId={document.id} fileName={document.fileName ?? document.title} mimeType={document.mimeType} protectedFile={document.visibility === "PROTECTED"} /></div>;
}
