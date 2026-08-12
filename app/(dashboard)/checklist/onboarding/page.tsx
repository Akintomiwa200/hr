import { redirect } from "next/navigation";
import { getSession, canManageEmployees } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { canViewChecklists } from "@/lib/checklist/access";
import { ensureDefaultOnboardingTemplate } from "@/lib/checklist/instantiate";
import { LINE_MANAGER_ROLES, assignableRolesFor } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { OnboardingPeopleModule } from "@/components/checklist/onboarding-people-module";

export default async function ChecklistOnboardingPage() {
  const session = await getSession();
  if (!session || !canViewChecklists(session)) redirect("/dashboard");
  if (!canManageEmployees(session.role)) redirect("/checklist/todos");

  const scope = getCompanyScope(session);
  const canManage = canManageEmployees(session.role);
  await ensureDefaultOnboardingTemplate(scope.companyId);

  const [departments, managers] = await Promise.all([
    prisma.department.findMany({
      where: scope.companyId ? { OR: [{ companyId: scope.companyId }, { companyId: null }] } : {},
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: {
        ...employeeCompanyWhere(scope),
        status: "ACTIVE",
        user: { role: { in: LINE_MANAGER_ROLES } },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Onboarding"
        description="Add people to the company — create their account, email login details, and start their checklist."
        action={<ModulePageActions helpSlug="employees" helpLabel="People guide" />}
      />
      <OnboardingPeopleModule
        canManage={canManage}
        departments={departments}
        managers={managers}
        allowedRoles={assignableRolesFor(session.role)}
      />
    </div>
  );
}
