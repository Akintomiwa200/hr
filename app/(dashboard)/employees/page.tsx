import { redirect } from "next/navigation";
import { getSession, canManageEmployees } from "@/lib/auth";
import { PEOPLE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { HelpLink } from "@/components/help/help-link";
import { EmployeesModule } from "@/components/employees/employees-module";

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [employees, departments, managers] = await Promise.all([
    prisma.employee.findMany({
      include: {
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { role: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { user: { role: { in: PEOPLE_ADMIN_ROLES } } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Browse and manage your organization's people directory"
        action={<HelpLink slug="employees" label="Employees guide" />}
      />
      <EmployeesModule
      employees={employees}
      departments={departments}
      managers={managers}
      canManage={canManageEmployees(session.role)}
      />
    </div>
  );
}
