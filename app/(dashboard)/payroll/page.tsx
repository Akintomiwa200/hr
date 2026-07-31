import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, StatCard, statusBadge, EmptyState } from "@/components/ui";
import { formatDate, formatCurrency, fullName } from "@/lib/utils";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";

export default async function PayrollPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { employeeId: session.employeeId }
      : {};

  const records = await prisma.payrollRecord.findMany({
    where: whereClause,
    include: { employee: true },
    orderBy: { periodStart: "desc" },
  });

  const totalPayroll = records.reduce((sum, r) => sum + r.netPay, 0);
  const avgSalary =
    records.length > 0 ? totalPayroll / records.length : 0;

  return (
    <div>
      <PageHeader
        title="Payroll"
        description={
          session.role === "EMPLOYEE"
            ? "View your payslips and salary history"
            : "Manage employee compensation and payroll"
        }
      />

      {(session.role === "ADMIN" || session.role === "MANAGER") && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Payroll"
            value={formatCurrency(totalPayroll)}
            icon={DollarSign}
          />
          <StatCard
            label="Employees Paid"
            value={records.length}
            icon={Wallet}
          />
          <StatCard
            label="Average Net Pay"
            value={formatCurrency(avgSalary)}
            icon={TrendingUp}
          />
        </div>
      )}

      <Card>
        {records.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No payroll records"
            description="Payroll records will appear here once processed."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {session.role !== "EMPLOYEE" && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Base Salary</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bonus</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Deductions</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Net Pay</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    {session.role !== "EMPLOYEE" && (
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {fullName(record.employee.firstName, record.employee.lastName)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(record.periodStart)} – {formatDate(record.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(record.baseSalary)}</td>
                    <td className="px-4 py-3 text-emerald-600">+{formatCurrency(record.bonus)}</td>
                    <td className="px-4 py-3 text-red-600">-{formatCurrency(record.deductions)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(record.netPay)}</td>
                    <td className="px-4 py-3">{statusBadge(record.status)}</td>
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
