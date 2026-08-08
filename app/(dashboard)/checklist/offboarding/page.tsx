import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, checklistCompanyWhere, employeeCompanyWhere } from "@/lib/company-scope";
import { canManageChecklists, canViewChecklists } from "@/lib/checklist/access";
import { PageHeader } from "@/components/ui";
import { ChecklistOnboardingModule } from "@/components/checklist/checklist-onboarding-module";

export default async function ChecklistOffboardingPage() {
  const session = await getSession();
  if (!session || !canViewChecklists(session)) redirect("/dashboard");

  const scope = getCompanyScope(session);

  const [employees, templates] = await Promise.all([
    prisma.employee.findMany({
      where: employeeCompanyWhere(scope),
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.checklistTemplate.findMany({
      where: { ...checklistCompanyWhere(scope), type: "OFFBOARDING", isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Offboarding" description="Manage employee exit checklists." />
      <ChecklistOnboardingModule
        type="OFFBOARDING"
        canManage={canManageChecklists(session)}
        employees={employees}
        templates={templates}
      />
    </div>
  );
}
