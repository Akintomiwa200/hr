import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession, canManageEmployees } from "@/lib/auth";
import { LINE_MANAGER_ROLES, assignableRolesFor } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  getCompanyScope,
  employeeCompanyWhere,
  departmentCompanyWhere,
} from "@/lib/company-scope";
import { peopleDirectoryEmployeeWhere } from "@/lib/employee-access";
import { getPeopleWorkspace } from "@/lib/role-workspace";
import { EmployeesModule } from "@/components/employees/employees-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const workspace = getPeopleWorkspace(session.role);
  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const orgDepartment = departmentCompanyWhere(scope);
  const directoryScope = await peopleDirectoryEmployeeWhere(session);

  const employeeWhere = directoryScope
    ? { AND: [orgEmployee, directoryScope] }
    : orgEmployee;

  const [employees, departments, managers] = await Promise.all([
    prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { role: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.department.findMany({
      where: directoryScope
        ? {
            AND: [
              orgDepartment,
              { employees: { some: employeeWhere } },
            ],
          }
        : orgDepartment,
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: {
        AND: [
          orgEmployee,
          ...(directoryScope ? [directoryScope] : []),
          { status: "ACTIVE" },
          { user: { role: { in: LINE_MANAGER_ROLES } } },
        ],
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading employees…</div>}>
      <>
        <PageLiveRefresh
          types={["employee_updated", "department_updated", "checklist_updated"]}
          pollIntervalMs={4000}
        />
        <EmployeesModule
          employees={employees}
          departments={departments}
          managers={managers}
          canManage={canManageEmployees(session.role)}
          allowedRoles={assignableRolesFor(session.role)}
          title={workspace.title}
          description={workspace.description}
          mode={workspace.mode}
        />
      </>
    </Suspense>
  );
}
