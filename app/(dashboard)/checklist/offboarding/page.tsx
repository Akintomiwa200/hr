import { redirect } from "next/navigation";
import { getSession, canManageEmployees } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { canViewChecklists } from "@/lib/checklist/access";
import { ensureDefaultOffboardingTemplate } from "@/lib/checklist/instantiate";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { OffboardingPeopleModule } from "@/components/checklist/offboarding-people-module";

export default async function ChecklistOffboardingPage() {
  const session = await getSession();
  if (!session || !canViewChecklists(session)) redirect("/dashboard");
  if (!canManageEmployees(session.role)) redirect("/checklist/todos");

  const scope = getCompanyScope(session);
  const canManage = canManageEmployees(session.role);
  await ensureDefaultOffboardingTemplate(scope.companyId);

  const employees = await prisma.employee.findMany({
    where: employeeCompanyWhere(scope),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      status: true,
      department: { select: { name: true } },
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Offboarding"
        description="Remove people from the company — deactivate access and run the exit checklist."
        action={<ModulePageActions helpSlug="employees" helpLabel="People guide" />}
      />
      <OffboardingPeopleModule canManage={canManage} employees={employees} />
    </div>
  );
}
