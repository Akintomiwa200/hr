import { redirect } from "next/navigation";
import { getSession, canManageEmployees } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Avatar, statusBadge, EmptyState } from "@/components/ui";
import { fullName, formatDate } from "@/lib/utils";
import { Users } from "lucide-react";
import Link from "next/link";

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const employees = await prisma.employee.findMany({
    include: { department: true, manager: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description={
          canManageEmployees(session.role)
            ? "Manage your organization's workforce"
            : "View team directory"
        }
        action={
          session.role === "ADMIN" ? (
            <Link
              href="/employees/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add Employee
            </Link>
          ) : undefined
        }
      />

      <Card>
        {employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees yet"
            description="Add your first employee to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Job Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Manager</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hire Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/employees/${emp.id}`} className="flex items-center gap-3 group">
                        <Avatar firstName={emp.firstName} lastName={emp.lastName} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-indigo-600">
                            {fullName(emp.firstName, emp.lastName)}
                          </p>
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.department.name}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.jobTitle}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {emp.manager
                        ? fullName(emp.manager.firstName, emp.manager.lastName)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(emp.hireDate)}</td>
                    <td className="px-4 py-3">{statusBadge(emp.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
