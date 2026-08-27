import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isPortalTemplateModelReady, prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere, portalTemplateCompanyWhere } from "@/lib/company-scope";
import { canManageLetters } from "@/lib/letters/access";
import { LetterEditorModule } from "@/components/letters/letter-editor-module";

export default async function LetterEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageLetters(session)) redirect("/letters");
  if (!isPortalTemplateModelReady()) redirect("/letters");

  const { id } = await params;
  if (id === "documents") redirect("/letters");
  const scope = getCompanyScope(session);
  const [template, employees, company] = await Promise.all([
    prisma.portalTemplate.findFirst({
      where: { id, ...portalTemplateCompanyWhere(scope) },
    }),
    prisma.employee.findMany({
      where: { ...employeeCompanyWhere(scope), status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        department: { select: { name: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    session.companyId
      ? prisma.company.findUnique({ where: { id: session.companyId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  if (!template) notFound();

  return (
    <LetterEditorModule
      companyName={company?.name ?? "Company"}
      template={{
        id: template.id,
        kind: template.kind,
        category: template.category,
        title: template.title,
        description: template.description,
        body: template.body,
        fieldsJson: template.fieldsJson,
        isPublished: template.isPublished,
      }}
      employees={employees.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        jobTitle: e.jobTitle,
        department: e.department.name,
      }))}
    />
  );
}
