"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Timer,
  UserCheck,
  UserX,
  CalendarX2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SummaryMonthReport } from "@/lib/reports/summary";

function statCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", tint)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 leading-tight">
            {label}
          </p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function SummaryModule({ data }: { data: SummaryMonthReport }) {
  const { attendance, leave, employees, scope } = data;

  return (
    <div className="space-y-6">
      {scope !== "org" && (
        <p className="text-sm text-gray-500 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
          {scope === "team"
            ? "Scoped to your direct reports. Company-wide summaries stay with HR / Company Admin."
            : "Personal summary only — org analytics are available to HR and managers."}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCard({
          label: "Attendance days",
          value: attendance.totalRecords,
          icon: CalendarDays,
          tint: "bg-violet-50 text-violet-600",
        })}
        {statCard({
          label: "On time",
          value: attendance.present + attendance.early,
          icon: CheckCircle2,
          tint: "bg-emerald-50 text-emerald-600",
        })}
        {statCard({
          label: "Late arrivals",
          value: attendance.late,
          icon: Clock,
          tint: "bg-amber-50 text-amber-600",
        })}
        {statCard({
          label: "Absent days",
          value: attendance.absent,
          icon: UserX,
          tint: "bg-red-50 text-red-600",
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCard({
          label: "Employees present",
          value: data.presentEmployees,
          icon: UserCheck,
          tint: "bg-sky-50 text-sky-600",
        })}
        {statCard({
          label: "Approved requests",
          value: leave.approvedRequests,
          icon: CheckCircle2,
          tint: "bg-emerald-50 text-emerald-600",
        })}
        {statCard({
          label: "Approved leave days",
          value: leave.approvedDays,
          icon: Timer,
          tint: "bg-violet-50 text-violet-600",
        })}
        {statCard({
          label: "Pending requests",
          value: leave.pending,
          icon: CalendarX2,
          tint: "bg-gray-100 text-gray-600",
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[12.5px] text-gray-500">
        {[
          { label: "Lates", value: attendance.late, ratio: attendance.totalRecords || 1 },
          { label: "Absent", value: attendance.absent, ratio: attendance.totalRecords || 1 },
          { label: "Approved leave", value: leave.approvedDays, ratio: attendance.totalRecords || 1 },
        ].map((item) => (
          <div key={item.label} className="flex-1 min-w-[140px]">
            <div className="flex items-center justify-between">
              <span>{item.label}</span>
              <span className="font-semibold text-gray-900">{item.value}</span>
            </div>
            <div className="mt-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{ width: `${Math.min(100, Math.round((item.value / item.ratio) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2.5 font-semibold">Employee</th>
              <th className="px-4 py-2.5 font-semibold">Department</th>
              <th className="px-4 py-2.5 font-semibold">Worked days</th>
              <th className="px-4 py-2.5 font-semibold">Late days</th>
              <th className="px-4 py-2.5 font-semibold">Absent</th>
              <th className="px-4 py-2.5 font-semibold">Approved leave days</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No attendance or leave records for this month yet.
                </td>
              </tr>
            ) : (
              employees.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/employees/${row.id}`}
                      className="text-gray-900 font-medium hover:text-violet-600"
                    >
                      {row.name}
                    </Link>
                    {row.employeeCode && (
                      <span className="ml-2 text-[11px] text-gray-400">{row.employeeCode}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{row.department ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-700">{row.workedDays}</td>
                  <td className="px-4 py-2.5 text-amber-600">{row.lateDays}</td>
                  <td className="px-4 py-2.5 text-red-600">{row.absentDays}</td>
                  <td className="px-4 py-2.5 text-violet-600">{row.approvedLeaveDays}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}