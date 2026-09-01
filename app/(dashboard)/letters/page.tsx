import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isPortalTemplateModelReady, prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere, portalTemplateCompanyWhere, portalDocumentCompanyWhere } from "@/lib/company-scope";
import { canManageLetters } from "@/lib/letters/access";
import { ensureDefaultPortalTemplates } from "@/lib/letters/ensure";
import { Card, PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { LettersModule } from "@/components/letters/letters-module";

export default async function LettersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageLetters(session) && !session.employeeId) redirect("/dashboard");

  if (!isPortalTemplateModelReady()) {
    return (
      <div>
        <PageHeader title="Letters & forms" description="Create HR letters and forms in the portal" />
        <Card className="p-6 text-sm text-gray-600">
          Letters are not available yet. Stop the dev server, run{" "}
          <code className="bg-gray-100 px-1 rounded">npx prisma generate</code>, then restart.
        </Card>
      </div>
    );
  }

  const scope = getCompanyScope(session);
  const manage = canManageLetters(session);
  if (manage) {
    await ensureDefaultPortalTemplates(scope.companyId);
  }

  const [templatesRaw, documentsRaw, employeesRaw] = await Promise.all([
    manage
      ? prisma.portalTemplate.findMany({
          where: portalTemplateCompanyWhere(scope),
          include: { _count: { select: { documents: true } } },
          orderBy: [{ kind: "asc" }, { title: "asc" }],
        })
      : Promise.resolve([]),
    prisma.portalDocument.findMany({
      where: manage
        ? portalDocumentCompanyWhere(scope)
        : { ...portalDocumentCompanyWhere(scope), employeeId: session.employeeId ?? "__none__" },
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    manage
      ? prisma.employee.findMany({
          where: { ...employeeCompanyWhere(scope), status: "ACTIVE" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            jobTitle: true,
            address: true,
            salary: true,
            department: { select: { name: true } },
          },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Letters & forms"
        description={
          manage
            ? "Create offer letters, certificates, warnings, and HR forms in the portal. Issue them live to employees."
            : "Letters and forms issued to you"
        }
        action={<ModulePageActions helpSlug="letters" helpLabel="Letters guide" />}
      />
      <LettersModule
        canManage={manage}
        templates={templatesRaw.map((t) => ({
          id: t.id,
          kind: t.kind,
          category: t.category,
          title: t.title,
          description: t.description,
          isPublished: t.isPublished,
          createdByName: t.createdByName,
          updatedAt: t.updatedAt.toISOString(),
          documentCount: t._count.documents,
          fieldsJson: t.fieldsJson,
        }))}
        documents={documentsRaw.map((d) => ({
          id: d.id,
          kind: d.kind,
          title: d.title,
          status: d.status,
          issuedByName: d.issuedByName,
          issuedAt: d.issuedAt?.toISOString() ?? null,
          createdAt: d.createdAt.toISOString(),
          employeeName: d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : "Unassigned",
        }))}
        employees={employeesRaw.map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          employeeCode: e.employeeCode,
          jobTitle: e.jobTitle,
          department: e.department.name,
          address: e.address,
          salary: e.salary,
        }))}
      />
    </div>
  );
}
