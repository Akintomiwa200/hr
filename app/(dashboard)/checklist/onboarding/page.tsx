import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, checklistCompanyWhere, employeeCompanyWhere } from "@/lib/company-scope";
import { canManageChecklists, canViewChecklists } from "@/lib/checklist/access";
import { ensureDefaultOnboardingTemplate } from "@/lib/checklist/instantiate";
import { PageHeader } from "@/components/ui";
import { ChecklistOnboardingModule } from "@/components/checklist/checklist-onboarding-module";

export default async function ChecklistOnboardingPage() {
  const session = await getSession();
  if (!session || !canViewChecklists(session)) redirect("/dashboard");

  const scope = getCompanyScope(session);
  await ensureDefaultOnboardingTemplate(scope.companyId);

  const [employees, templates] = await Promise.all([
    prisma.employee.findMany({
      where: employeeCompanyWhere(scope),
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.checklistTemplate.findMany({
      where: { ...checklistCompanyWhere(scope), type: "ONBOARDING", isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Onboarding" description="Track new hire checklist progress in real time." />
      <ChecklistOnboardingModule
        type="ONBOARDING"
        canManage={canManageChecklists(session)}
        employees={employees}
        templates={templates}
      />
    </div>
  );
}
