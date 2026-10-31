"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  Search,
  UserMinus,
  X,
  XCircle,
} from "lucide-react";
import { Avatar, Badge, EmptyState, StatCard } from "@/components/ui";
import { ResignationForm } from "@/components/resignation/resignation-form";
import { ResignationActions } from "@/components/resignation/resignation-actions";
import {
  resignationStatusLabel,
  resignationStatusVariant,
} from "@/lib/resignation/service";
import { cn, formatDate, fullName } from "@/lib/utils";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";

export type ResignationRow = {
  id: string;
  status: string;
  reason: string;
  noticePeriodDays: number;
  requestedLastWorkingDay: string | Date;
  lastWorkingDay: string | Date;
  managerNote?: string | null;
  hrNote?: string | null;
  offboardingInstanceId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  managerId?: string | null;
  employee: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    avatar?: string | null;
    jobTitle: string;
    managerId?: string | null;
    department?: { name: string } | null;
    managers?: { id: string }[];
  };
  manager?: { firstName: string; lastName: string } | null;
  hrReviewer?: { firstName: string; lastName: string } | null;
};

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PENDING_MANAGER", label: "Manager" },
  { id: "PENDING_HR", label: "HR" },
  { id: "APPROVED", label: "Approved" },
  { id: "COMPLETED", label: "Completed" },
  { id: "REJECTED", label: "Rejected" },
  { id: "WITHDRAWN", label: "Withdrawn" },
] as const;

function isPending(status: string) {
  return status === "PENDING_MANAGER" || status === "PENDING_HR";
}

export function ResignationModule({
  resignations,
  noticePeriodDays,
  allowWithdrawal,
  canSubmit,
  currentEmployeeId,
  isAdmin,
  mode,
}: {
  resignations: ResignationRow[];
  noticePeriodDays: number;
  allowWithdrawal: boolean;
  canSubmit: boolean;
  currentEmployeeId?: string | null;
  isAdmin: boolean;
  mode: "self" | "team" | "org";
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useAppEvents({
    types: ["resignation_updated", "employee_updated"],
    onEvent: (type) => {
      if (!type) return;
      scheduleRouterRefresh(() => router.refresh());
    },
  });

  const stats = useMemo(() => {
    const pending = resignations.filter((row) => isPending(row.status)).length;
    const approved = resignations.filter((row) => row.status === "APPROVED").length;
    const completed = resignations.filter((row) => row.status === "COMPLETED").length;
    const closed = resignations.filter((row) =>
      ["REJECTED", "WITHDRAWN"].includes(row.status)
    ).length;
    return { pending, approved, completed, closed, total: resignations.length };
  }, [resignations]);

  const filtered = useMemo(() => {
    let list = resignations;
    if (statusFilter !== "ALL") list = list.filter((row) => row.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (row) =>
        fullName(row.employee.firstName, row.employee.lastName, row.employee.middleName)
          .toLowerCase()
          .includes(q) ||
        row.reason.toLowerCase().includes(q) ||
        row.employee.jobTitle.toLowerCase().includes(q)
    );
  }, [resignations, search, statusFilter]);

  function canEndorse(row: ResignationRow) {
    if (row.status !== "PENDING_MANAGER") return false;
    if (isAdmin) return true;
    if (!currentEmployeeId || currentEmployeeId === row.employee.id) return false;
    const managerIds = new Set(
      [row.managerId, row.employee.managerId, ...(row.employee.managers ?? []).map((m) => m.id)]
        .filter(Boolean)
    );
    return managerIds.has(currentEmployeeId);
  }

  const title =
    mode === "self"
      ? "Your resignations"
      : mode === "team"
        ? "Team resignations"
        : "Resignation queue";

  const hint =
    mode === "self"
      ? "Track your notice period and approval progress"
      : mode === "team"
        ? "Endorse resignations from people in your reporting line"
        : isAdmin
          ? "Approve, schedule, and complete employee resignations"
          : "Resignation activity in your scope";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total requests" value={stats.total} icon={UserMinus} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} />
        <StatCard label="Completed" value={stats.completed} icon={CalendarClock} />
      </div>

      {canSubmit && (
        <ResignationForm noticePeriodDays={noticePeriodDays} />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-amber-50/40 via-white to-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resignations..."
              className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 w-full sm:w-64"
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

        <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={cn(
                "px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors",
                statusFilter === filter.id
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={UserMinus}
              title="No resignations"
              description={
                canSubmit
                  ? "Submit your resignation above — it will appear here once sent."
                  : "Resignation requests in this view will show up here."
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((row) => {
                const showPerson = mode !== "self" || row.employee.id !== currentEmployeeId;
                const pending = isPending(row.status);
                return (
                  <article
                    key={row.id}
                    className="rounded-xl border border-gray-100 p-4 hover:border-amber-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        {showPerson && (
                          <Avatar
                            firstName={row.employee.firstName}
                            lastName={row.employee.lastName}
                            src={row.employee.avatar}
                            size="sm"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {showPerson ? (
                              <Link
                                href={`/employees/${row.employee.id}`}
                                className="text-sm font-semibold text-gray-900 hover:text-brand-600"
                              >
                                {fullName(
                                  row.employee.firstName,
                                  row.employee.lastName,
                                  row.employee.middleName
                                )}
                              </Link>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">
                                Your resignation
                              </span>
                            )}
                            <Badge variant={resignationStatusVariant(row.status)}>
                              {resignationStatusLabel(row.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {row.employee.jobTitle}
                            {row.employee.department?.name
                              ? ` · ${row.employee.department.name}`
                              : ""}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                            <span className="text-gray-500">
                              Last working day{" "}
                              <span className="font-medium text-gray-800">
                                {formatDate(row.lastWorkingDay)}
                              </span>
                            </span>
                            <span className="text-gray-400">
                              {row.noticePeriodDays} day notice
                            </span>
                            <span className="text-gray-400">
                              Submitted {formatDate(row.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{row.reason}</p>
                          {row.managerNote && row.status !== "PENDING_MANAGER" && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              Manager note: {row.managerNote}
                            </p>
                          )}
                          {row.hrNote && row.status !== "PENDING_HR" && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              HR note: {row.hrNote}
                            </p>
                          )}
                          {row.offboardingInstanceId && (
                            <Link
                              href={`/checklist/offboarding/${row.offboardingInstanceId}`}
                              className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-medium text-brand-600 hover:underline"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                              Open exit checklist
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                        <Link
                          href={`/resignation/${row.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:underline"
                        >
                          View details <ArrowRight className="w-3 h-3" />
                        </Link>
                        <ResignationActions
                          resignationId={row.id}
                          lastWorkingDay={String(row.lastWorkingDay)}
                          canEndorse={canEndorse(row)}
                          canApprove={
                            isAdmin && (row.status === "PENDING_MANAGER" || row.status === "PENDING_HR")
                          }
                          canReject={
                            (row.status === "PENDING_MANAGER" && canEndorse(row)) ||
                            (row.status === "PENDING_HR" && isAdmin)
                          }
                          canWithdraw={
                            allowWithdrawal &&
                            row.employee.id === currentEmployeeId &&
                            pending
                          }
                          canComplete={isAdmin && row.status === "APPROVED"}
                          canSchedule={
                            isAdmin || (row.employee.id === currentEmployeeId && pending)
                          }
                        />
                        {!isPending(row.status) && row.status !== "APPROVED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                            {row.status === "COMPLETED" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {resignationStatusLabel(row.status)}
                          </span>
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
