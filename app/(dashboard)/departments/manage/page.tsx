import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageDepartments } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, departmentCompanyWhere } from "@/lib/company-scope";
import { PageHeader } from "@/components/ui";
import { HelpLink } from "@/components/help/help-link";
import { DepartmentsModule } from "@/components/departments/departments-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function ManageDepartmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageDepartments(session.role)) redirect("/departments");

  const scope = getCompanyScope(session);

  const departments = await prisma.department.findMany({
    where: departmentCompanyWhere(scope),
    include: {
      _count: {
        select: {
          employees: {
            where: {
              status: "ACTIVE",
              ...(scope.companyId ? { user: { companyId: scope.companyId } } : {}),
            },
          },
          jobs: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageLiveRefresh
        types={["department_updated", "employee_updated", "job_updated"]}
        pollIntervalMs={4000}
      />
      <PageHeader
        title="Departments"
        description="Create and manage departments in real time — changes appear on Org Chart and Teams immediately"
        action={<HelpLink slug="teams" label="Departments guide" />}
      />
      <DepartmentsModule departments={departments} canManage />
    </div>
  );
}
