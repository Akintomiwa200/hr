"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  X,
} from "lucide-react";
import { Avatar, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { LeaveRequestForm } from "@/components/leave/leave-form";
import { LeaveActions } from "@/components/leave/leave-actions";
import { leaveDays, leaveTypeLabel, leaveTypeStyle } from "@/lib/leave-utils";
import { cn, formatDate, fullName } from "@/lib/utils";
import { useAppEvents } from "@/hooks/use-app-events";
import { useRouter } from "next/navigation";

type LeaveRow = {
  id: string;
  type: string;
  startDate: Date | string;
  endDate: Date | string;
  reason: string;
  status: string;
  createdAt: Date | string;
  employee: { id: string; firstName: string; lastName: string };
  approver: { firstName: string; lastName: string } | null;
};

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
] as const;

export function LeaveModule({
  leaves,
  canApprove,
  isEmployee,
  showRequestForm,
}: {
  leaves: LeaveRow[];
  canApprove: boolean;
  isEmployee: boolean;
  showRequestForm: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const router = useRouter();

  useAppEvents({
    types: ["leave_updated", "employee_updated"],
    pollIntervalMs: 4000,
    onEvent: () => router.refresh(),
  });

  const stats = useMemo(() => {
    const pending = leaves.filter((l) => l.status === "PENDING").length;
    const approved = leaves.filter((l) => l.status === "APPROVED").length;
    const rejected = leaves.filter((l) => l.status === "REJECTED").length;
    const days = leaves
      .filter((l) => l.status === "APPROVED")
      .reduce((sum, l) => sum + leaveDays(l.startDate, l.endDate), 0);
    return { pending, approved, rejected, days, total: leaves.length };
  }, [leaves]);

  const filtered = useMemo(() => {
    let list = leaves;
    if (statusFilter !== "ALL") list = list.filter((l) => l.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (l) =>
        leaveTypeLabel(l.type).toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q) ||
        fullName(l.employee.firstName, l.employee.lastName).toLowerCase().includes(q)
    );
  }, [leaves, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total requests" value={stats.total} icon={CalendarDays} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} />
        <StatCard
          label={isEmployee ? "Days approved" : "Approved days"}
          value={stats.days}
          icon={CalendarRange}
        />
      </div>

      {showRequestForm && (
        <LeaveRequestForm />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-brand-50/30 via-white to-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEmployee ? "Your leave history" : "Leave requests"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {canApprove
                ? "Review, approve, or reject team leave requests"
                : "Track status and dates for your submissions"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requests..."
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 w-full sm:w-56"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors",
                statusFilter === f.id
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No leave requests"
              description={
                showRequestForm
                  ? "Submit a request above — it will appear here once sent."
                  : "Leave requests from your team will show up here."
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((leave) => {
                const style = leaveTypeStyle(leave.type);
                const days = leaveDays(leave.startDate, leave.endDate);
                return (
                  <article
                    key={leave.id}
                    className="rounded-xl border border-gray-100 p-4 hover:border-brand-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {!isEmployee && (
                          <Avatar
                            firstName={leave.employee.firstName}
                            lastName={leave.employee.lastName}
                            size="sm"
                          />
                        )}
                        <div className="min-w-0">
                          {!isEmployee && (
                            <Link
                              href={`/employees/${leave.employee.id}/leave`}
                              className="text-sm font-semibold text-gray-900 hover:text-brand-600"
                            >
                              {fullName(leave.employee.firstName, leave.employee.lastName)}
                            </Link>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                                style.badge
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                              {leaveTypeLabel(leave.type)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                            </span>
                            <span className="text-xs font-medium text-brand-600">
                              {days} day{days === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{leave.reason}</p>
                          {leave.approver && leave.status !== "PENDING" && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              Reviewed by {fullName(leave.approver.firstName, leave.approver.lastName)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {statusBadge(leave.status)}
                        {canApprove && leave.status === "PENDING" && (
                          <LeaveActions leaveId={leave.id} />
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
