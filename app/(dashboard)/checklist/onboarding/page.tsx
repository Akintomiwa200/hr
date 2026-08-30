import { redirect } from "next/navigation";
import { getSession, canManageEmployees } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { canViewChecklists } from "@/lib/checklist/access";
import { ensureDefaultOnboardingTemplate } from "@/lib/checklist/instantiate";
import { LINE_MANAGER_ROLES, assignableRolesFor, roleLabel } from "@/lib/roles";
import { roleDefinitionCompanyWhere } from "@/lib/roles-catalog";
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

  const assignable = assignableRolesFor(session.role);
  const customRoles = await prisma.roleDefinition.findMany({
    where: {
      ...roleDefinitionCompanyWhere(scope),
      isActive: true,
    },
    orderBy: { label: "asc" },
  });
  const roleOptions = [
    ...assignable.map((role) => ({ baseRole: role, label: roleLabel(role), roleId: null })),
    ...customRoles
      .filter((c) => assignable.includes(c.baseRole))
      .map((c) => ({ baseRole: c.baseRole, label: c.label, roleId: c.id })),
  ];

  const [departments, managers, jobTitleRows] = await Promise.all([
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
    prisma.job.findMany({
      where: scope.companyId ? { companyId: scope.companyId } : {},
      select: { title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const jobTitles = [
    ...new Set([
      ...jobTitleRows.map((j) => j.title.trim()).filter(Boolean),
      ...(await prisma.employee
        .findMany({
          where: { ...employeeCompanyWhere(scope), jobTitle: { not: "" } },
          distinct: ["jobTitle"],
          select: { jobTitle: true },
        })
        .then((rows) => rows.map((r) => r.jobTitle))),
    ]),
  ].sort((a, b) => a.localeCompare(b));

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
        jobTitles={jobTitles}
        roleOptions={roleOptions}
      />
    </div>
  );
}
