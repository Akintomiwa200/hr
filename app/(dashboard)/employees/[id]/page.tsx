import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader, Avatar, statusBadge } from "@/components/ui";
import { formatDate, formatCurrency, fullName } from "@/lib/utils";
import Link from "next/link";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      manager: true,
      directReports: true,
      leaveRequests: { take: 5, orderBy: { createdAt: "desc" } },
      attendanceRecords: { take: 5, orderBy: { date: "desc" } },
    },
  });

  if (!employee) notFound();

  const canViewSalary = session.role === "ADMIN" || session.employeeId === employee.id;

  return (
    <div>
      <PageHeader
        title={fullName(employee.firstName, employee.lastName)}
        description={`${employee.jobTitle} · ${employee.department.name}`}
        action={
          <Link
            href="/employees"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to employees
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <Avatar
              firstName={employee.firstName}
              lastName={employee.lastName}
              size="lg"
            />
            <h2 className="text-lg font-semibold text-gray-900 mt-4">
              {fullName(employee.firstName, employee.lastName)}
            </h2>
            <p className="text-sm text-indigo-600">{employee.jobTitle}</p>
            <div className="mt-3">{statusBadge(employee.status)}</div>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Employee Code</dt>
              <dd className="font-medium text-gray-900">{employee.employeeCode}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{employee.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium text-gray-900">{employee.phone || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Department</dt>
              <dd className="font-medium text-gray-900">{employee.department.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Manager</dt>
              <dd className="font-medium text-gray-900">
                {employee.manager
                  ? fullName(employee.manager.firstName, employee.manager.lastName)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Hire Date</dt>
              <dd className="font-medium text-gray-900">{formatDate(employee.hireDate)}</dd>
            </div>
            {canViewSalary && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Salary</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(employee.salary)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {employee.directReports.length > 0 && (
            <Card>
              <CardHeader title="Direct Reports" description={`${employee.directReports.length} team members`} />
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employee.directReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/employees/${report.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Avatar firstName={report.firstName} lastName={report.lastName} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fullName(report.firstName, report.lastName)}
                      </p>
                      <p className="text-xs text-gray-500">{report.jobTitle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Recent Attendance" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Check In</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Check Out</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3">{formatDate(record.date)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {record.checkIn
                          ? new Date(record.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {record.checkOut
                          ? new Date(record.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{statusBadge(record.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
