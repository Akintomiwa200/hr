"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, XCircle } from "lucide-react";
import { EmptyState, StatCard, statusBadge } from "@/components/ui";
import { EmployeeTimeNav } from "@/components/employees/employee-time-nav";
import { LeaveRequestForm } from "@/components/leave/leave-form";
import { LeaveActions } from "@/components/leave/leave-actions";
import { leaveDays, leaveTypeLabel, leaveTypeStyle } from "@/lib/leave-utils";
import { cn, formatDate, fullName } from "@/lib/utils";

type Leave = {
  id: string;
  type: string;
  startDate: Date | string;
  endDate: Date | string;
  reason: string;
  status: string;
};

export function EmployeeLeaveModule({
  employeeId,
  employeeName,
  leaves,
  showRequestForm,
  canApprove,
  showPayrollTab = false,
}: {
  employeeId: string;
  employeeName: string;
  leaves: Leave[];
  showRequestForm: boolean;
  canApprove: boolean;
  showPayrollTab?: boolean;
}) {
  const pending = leaves.filter((l) => l.status === "PENDING").length;
  const approved = leaves.filter((l) => l.status === "APPROVED").length;
  const rejected = leaves.filter((l) => l.status === "REJECTED").length;

  return (
    <div>
      <EmployeeTimeNav employeeId={employeeId} active="leave" showPayrollTab={showPayrollTab} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={leaves.length} icon={CalendarDays} />
        <StatCard label="Pending" value={pending} icon={Clock} />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} />
        <StatCard label="Rejected" value={rejected} icon={XCircle} />
      </div>

      {showRequestForm && (
        <div className="mb-6">
          <LeaveRequestForm compact />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-50/30 to-white">
          <h2 className="text-base font-semibold text-gray-900">{employeeName}&apos;s leave</h2>
          <p className="text-xs text-gray-500 mt-0.5">Request history and approval status</p>
        </div>
        <div className="p-5 space-y-3">
          {leaves.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No leave yet" description="Leave requests will appear here." />
          ) : (
            leaves.map((leave) => {
              const style = leaveTypeStyle(leave.type);
              return (
                <article key={leave.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold", style.badge)}>
                        {leaveTypeLabel(leave.type)}
                      </span>
                      <p className="text-sm text-gray-600 mt-2">
                        {formatDate(leave.startDate)} → {formatDate(leave.endDate)} ·{" "}
                        {leaveDays(leave.startDate, leave.endDate)} days
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{leave.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(leave.status)}
                      {canApprove && leave.status === "PENDING" && (
                        <LeaveActions leaveId={leave.id} />
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
