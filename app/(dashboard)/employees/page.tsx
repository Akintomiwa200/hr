import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession, canManageEmployees } from "@/lib/auth";
import { LINE_MANAGER_ROLES, assignableRolesFor } from "@/lib/roles";
import { requirePeoplePage } from "@/lib/page-access";
import { prisma } from "@/lib/prisma";
import {
  getCompanyScope,
  employeeCompanyWhere,
  departmentCompanyWhere,
  branchCompanyWhere,
} from "@/lib/company-scope";
import { peopleDirectoryEmployeeWhere } from "@/lib/employee-access";
import { getPeopleWorkspace } from "@/lib/role-workspace";
import { EmployeesModule } from "@/components/employees/employees-module";

export default async function EmployeesPage() {
  const session = await getSession();
  requirePeoplePage(session);

  const workspace = getPeopleWorkspace(session.role);
  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const orgDepartment = departmentCompanyWhere(scope);
  const directoryScope = await peopleDirectoryEmployeeWhere(session);

  const employeeWhere = directoryScope
    ? { AND: [orgEmployee, directoryScope] }
    : orgEmployee;

  const [employees, departments, branches, managers] = await Promise.all([
    prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: true,
        branch: { select: { id: true, name: true, location: true } },
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
    prisma.branch.findMany({
      where: branchCompanyWhere(scope),
      orderBy: { name: "asc" },
      select: { id: true, name: true, location: true },
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
      <EmployeesModule
        employees={employees}
        departments={departments}
        branches={branches}
        managers={managers}
        canManage={canManageEmployees(session.role)}
        canExport={canManageEmployees(session.role)}
        canViewSalary={canManageEmployees(session.role)}
        canViewTimeTabs={canManageEmployees(session.role) || session.role === "MANAGER" || session.role === "SUPERVISOR"}
        allowedRoles={assignableRolesFor(session.role)}
        title={workspace.title}
        description={workspace.description}
        mode={workspace.mode}
      />
    </Suspense>
  );
}
