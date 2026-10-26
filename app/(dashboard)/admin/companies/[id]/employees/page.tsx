import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import { Badge } from "@/components/ui";

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CompanyEmployeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!company) notFound();

  const employees = await prisma.employee.findMany({
    where: { user: { companyId: id } },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      status: true,
      hireDate: true,
      department: { select: { name: true } },
      user: { select: { role: true } },
    },
    orderBy: [{ status: "asc" }, { firstName: "asc" }],
    take: 500,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900">Employees</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Employee records connected to this tenant.
          </p>
        </div>
        <Badge variant="info">{employees.length} shown</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-semibold">Code</th>
              <th className="px-5 py-3 font-semibold">Employee</th>
              <th className="px-5 py-3 font-semibold">Job title</th>
              <th className="px-5 py-3 font-semibold">Department</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Hired</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50/60">
                <td className="px-5 py-3 font-mono text-[11.5px] text-violet-700">
                  {employee.employeeCode}
                </td>
                <td className="px-5 py-3">
                  <p className="text-[12.5px] font-medium text-gray-900">
                    {fullName(employee.firstName, employee.lastName)}
                  </p>
                  <p className="text-[11px] text-gray-500">{employee.email}</p>
                </td>
                <td className="px-5 py-3 text-[12.5px] text-gray-700">
                  {employee.jobTitle}
                </td>
                <td className="px-5 py-3 text-[12px] text-gray-600">
                  {employee.department.name}
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                    {roleLabel(employee.user.role)}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-[12px] text-gray-500">
                  {formatDate(employee.hireDate)}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={employee.status === "ACTIVE" ? "success" : "neutral"}>
                    {employee.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500">
                  No employees belong to this company yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
