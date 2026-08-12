"use client";

import Link from "next/link";
import { Download, Eye, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { EmptyState, StatCard, statusBadge } from "@/components/ui";
import { EmployeeTimeNav } from "@/components/employees/employee-time-nav";
import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";

type PayrollRecord = {
  id: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number;
  status: string;
};

export function EmployeePayrollModule({
  employeeId,
  employeeName,
  baseSalary,
  records,
}: {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  records: PayrollRecord[];
}) {
  const formatCurrency = useFormatCurrency();
  const totalNet = records.reduce((sum, r) => sum + r.netPay, 0);
  const totalDeductions = records.reduce((sum, r) => sum + r.deductions, 0);
  const latest = records[0] ?? null;

  return (
    <div>
      <EmployeeTimeNav employeeId={employeeId} active="payroll" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Base salary" value={formatCurrency(baseSalary)} icon={Wallet} />
        <StatCard
          label="Latest net"
          value={latest ? formatCurrency(latest.netPay) : "—"}
          icon={TrendingUp}
        />
        <StatCard label="Total net" value={formatCurrency(totalNet)} icon={Wallet} />
        <StatCard label="Deductions" value={formatCurrency(totalDeductions)} icon={TrendingDown} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-50/30 to-white">
          <h2 className="text-base font-semibold text-gray-900">{employeeName}&apos;s payslips</h2>
          <p className="text-xs text-gray-500 mt-0.5">View breakdown or download salary slips</p>
        </div>
        <div className="p-5 space-y-3">
          {records.length === 0 ? (
            <EmptyState icon={Wallet} title="No payslips" description="Payroll records will appear here when processed." />
          ) : (
            records.map((record) => (
              <article
                key={record.id}
                className="rounded-xl border border-gray-100 p-4 hover:border-brand-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(record.periodStart)} – {formatDate(record.periodEnd)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Base {formatCurrency(record.baseSalary)} · Bonus {formatCurrency(record.bonus)}
                    </p>
                    <p className="text-lg font-bold text-emerald-600 mt-2">
                      {formatCurrency(record.netPay)}
                      <span className="text-xs font-normal text-gray-400 ml-2">net pay</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(record.status)}
                    <Link
                      href={`/payroll/${record.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                    <a
                      href={`/api/payroll/${record.id}/payslip`}
                      download
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-brand-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </a>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
