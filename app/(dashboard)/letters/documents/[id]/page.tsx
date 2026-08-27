import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isPortalTemplateModelReady, prisma } from "@/lib/prisma";
import { canManageLetters, canViewLetterDocument } from "@/lib/letters/access";
import { LetterDocumentModule } from "@/components/letters/letter-document-module";

export default async function LetterDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isPortalTemplateModelReady()) redirect("/letters");

  const { id } = await params;
  const doc = await prisma.portalDocument.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      template: { select: { fieldsJson: true } },
    },
  });
  if (!doc) notFound();
  if (!canViewLetterDocument(session, doc)) redirect("/letters");

  return (
    <LetterDocumentModule
      canManage={canManageLetters(session)}
      isRecipient={Boolean(session.employeeId && doc.employeeId === session.employeeId)}
      document={{
        id: doc.id,
        kind: doc.kind,
        title: doc.title,
        body: doc.body,
        status: doc.status,
        fieldValuesJson: doc.fieldValuesJson,
        issuedByName: doc.issuedByName,
        issuedAt: doc.issuedAt?.toISOString() ?? null,
        acknowledgedAt: doc.acknowledgedAt?.toISOString() ?? null,
        employeeName: doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : "Unassigned",
        templateFieldsJson: doc.template?.fieldsJson ?? "[]",
      }}
    />
  );
}
