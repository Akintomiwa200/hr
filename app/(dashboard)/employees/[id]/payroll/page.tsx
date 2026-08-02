import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Download, Eye, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewEmployee, getEmployeeOrNull } from "@/lib/employee-access";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { statusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function EmployeePayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const employee = await getEmployeeOrNull(id);
  if (!employee) notFound();

  const allowed = await canViewEmployee(session, id);
  if (!allowed) redirect("/employees");

  const canViewSalary =
    allowed &&
    (session.role === "ADMIN" ||
      session.role === "MANAGER" ||
      session.employeeId === id);

  if (!canViewSalary) redirect(`/employees/${id}`);

  const records = await prisma.payrollRecord.findMany({
    where: { employeeId: id },
    orderBy: { periodStart: "desc" },
  });

  const totalNet = records.reduce((sum, r) => sum + r.netPay, 0);
  const totalDeductions = records.reduce((sum, r) => sum + r.deductions, 0);
  const latest = records[0] ?? null;

  return (
    <div>
      <EmployeeSubpageHeader
        employee={employee}
        title="Payroll"
        description="Salary history and payslip records"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          {
            label: "Base Salary",
            value: formatCurrency(employee.salary),
            color: "text-[#7B61FF]",
          },
          {
            label: "Latest Net Pay",
            value: latest ? formatCurrency(latest.netPay) : "—",
            color: "text-emerald-600",
          },
          {
            label: "Total Net (all)",
            value: formatCurrency(totalNet),
            color: "text-blue-600",
          },
          {
            label: "Total Deductions",
            value: formatCurrency(totalDeductions),
            color: "text-amber-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <p className="text-[12px] text-gray-500">{stat.label}</p>
            <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href={`/employees/${id}`}
          className="px-3 py-1.5 text-[12px] rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-violet-200"
        >
          Profile
        </Link>
        <Link
          href={`/employees/${id}/attendance`}
          className="px-3 py-1.5 text-[12px] rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-violet-200"
        >
          Attendance
        </Link>
        <Link
          href={`/employees/${id}/leave`}
          className="px-3 py-1.5 text-[12px] rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-violet-200"
        >
          Leave
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {records.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No payroll records yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#fafbfc] border-b border-gray-100">
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 text-left">Period</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">Base</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">Bonus</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">Deductions</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">Net Pay</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 text-left">Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 text-[13px] text-gray-700">
                      {formatDate(record.periodStart)} – {formatDate(record.periodEnd)}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-gray-500">
                      {formatCurrency(record.baseSalary)}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-gray-500">
                      {formatCurrency(record.bonus)}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-gray-500">
                      {formatCurrency(record.deductions)}
                    </td>
                    <td className="px-3 py-3.5 text-[13px] font-semibold text-emerald-600">
                      {formatCurrency(record.netPay)}
                    </td>
                    <td className="px-5 py-3.5">{statusBadge(record.status)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/payroll/${record.id}`}
                          className="p-2 text-gray-400 hover:text-violet-600 rounded-lg"
                          title="View breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a
                          href={`/api/payroll/${record.id}/payslip`}
                          download
                          className="p-2 text-gray-400 hover:text-violet-600 rounded-lg"
                          title="Download payslip"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
