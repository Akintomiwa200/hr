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
  mode = isEmployee ? "self" : "org",
  currentEmployeeId,
}: {
  leaves: LeaveRow[];
  canApprove: boolean;
  isEmployee: boolean;
  showRequestForm: boolean;
  mode?: "self" | "team" | "org" | "admin" | "directory";
  currentEmployeeId?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tab, setTab] = useState<"inbox" | "mine">(
    mode === "self" ? "mine" : "inbox"
  );
  const router = useRouter();

  useAppEvents({
    types: ["leave_updated", "employee_updated"],
    pollIntervalMs: 4000,
    onEvent: () => router.refresh(),
  });

  const myLeaves = useMemo(
    () =>
      currentEmployeeId
        ? leaves.filter((l) => l.employee.id === currentEmployeeId)
        : [],
    [leaves, currentEmployeeId]
  );

  const teamLeaves = useMemo(
    () =>
      currentEmployeeId
        ? leaves.filter((l) => l.employee.id !== currentEmployeeId)
        : leaves,
    [leaves, currentEmployeeId]
  );

  const activeLeaves =
    mode === "self" ? leaves : tab === "mine" ? myLeaves : teamLeaves;

  const stats = useMemo(() => {
    const source = mode === "self" ? leaves : tab === "mine" ? myLeaves : teamLeaves;
    const pending = source.filter((l) => l.status === "PENDING").length;
    const approved = source.filter((l) => l.status === "APPROVED").length;
    const rejected = source.filter((l) => l.status === "REJECTED").length;
    const days = source
      .filter((l) => l.status === "APPROVED")
      .reduce((sum, l) => sum + leaveDays(l.startDate, l.endDate), 0);
    return { pending, approved, rejected, days, total: source.length };
  }, [leaves, myLeaves, teamLeaves, mode, tab]);

  const filtered = useMemo(() => {
    let list = activeLeaves;
    if (statusFilter !== "ALL") list = list.filter((l) => l.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (l) =>
        leaveTypeLabel(l.type).toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q) ||
        fullName(l.employee.firstName, l.employee.lastName).toLowerCase().includes(q)
    );
  }, [activeLeaves, search, statusFilter]);

  const listTitle =
    mode === "self"
      ? "Your leave history"
      : tab === "mine"
        ? "Your requests"
        : mode === "team"
          ? "Team inbox"
          : "Organization inbox";

  const listHint =
    mode === "self"
      ? "Track status and dates for your submissions"
      : tab === "mine"
        ? "Your own time-off requests"
        : canApprove
          ? "Review, approve, or reject leave for people in your scope"
          : "Leave activity in your scope";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total requests" value={stats.total} icon={CalendarDays} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} />
        <StatCard
          label={mode === "self" || tab === "mine" ? "Days approved" : "Approved days"}
          value={stats.days}
          icon={CalendarRange}
        />
      </div>

      {showRequestForm && (
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50/50 to-white p-1">
          <div className="rounded-xl bg-white p-4 sm:p-5">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {mode === "self" ? "Request time off" : "Request your own leave"}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {mode === "self"
                ? "Submit a request for HR or your manager to approve."
                : "Leaders can take leave too — this does not affect the team approval inbox."}
            </p>
            <LeaveRequestForm />
          </div>
        </div>
      )}

      {mode !== "self" && currentEmployeeId && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-xl border transition-colors",
              tab === "inbox"
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
            )}
          >
            {mode === "team" ? "Team inbox" : "Org inbox"}
            {teamLeaves.filter((l) => l.status === "PENDING").length > 0 && (
              <span className="ml-2 text-[11px] opacity-90">
                ({teamLeaves.filter((l) => l.status === "PENDING").length} pending)
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-xl border transition-colors",
              tab === "mine"
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
            )}
          >
            My requests
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-brand-50/30 via-white to-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{listTitle}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{listHint}</p>
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
                showRequestForm && (mode === "self" || tab === "mine")
                  ? "Submit a request above — it will appear here once sent."
                  : "Leave requests in this view will show up here."
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((leave) => {
                const style = leaveTypeStyle(leave.type);
                const days = leaveDays(leave.startDate, leave.endDate);
                const showPerson = !(mode === "self" || tab === "mine");
                const canAct =
                  canApprove &&
                  leave.status === "PENDING" &&
                  leave.employee.id !== currentEmployeeId;
                return (
                  <article
                    key={leave.id}
                    className="rounded-xl border border-gray-100 p-4 hover:border-brand-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {showPerson && (
                          <Avatar
                            firstName={leave.employee.firstName}
                            lastName={leave.employee.lastName}
                            size="sm"
                          />
                        )}
                        <div className="min-w-0">
                          {showPerson && (
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
                        {canAct && <LeaveActions leaveId={leave.id} />}
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
