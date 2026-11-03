import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope } from "@/lib/company-scope";
import { canManageDocuments, canViewDocument, formatFileSize } from "@/lib/documents/access";
import { PageHeader, Card } from "@/components/ui";

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
  const previewable = (document.mimeType === "application/pdf" || document.mimeType?.startsWith("image/")) && document.visibility !== "PROTECTED";
  return <div><PageHeader title={document.title} description={`${document.fileName ?? document.title} · ${formatFileSize(document.fileSize)}`} /><Link href={back} className="mb-4 inline-block text-sm text-brand-600 hover:underline">← Back to employee documents</Link><Card className="p-0 overflow-hidden">{previewable ? <iframe title={document.title} src={`/api/documents/${document.id}/file?inline=1`} className="h-[75vh] w-full" /> : <div className="p-8 text-center"><p className="mb-4 text-sm text-gray-600">{document.visibility === "PROTECTED" ? "This file is password protected. Enter its PIN from the documents list to download it." : "Preview is not available for this file type."}</p><a href={`/api/documents/${document.id}/file`} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">Download document</a></div>}</Card></div>;
}
