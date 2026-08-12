"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  Medal,
  Percent,
  Plus,
  Settings,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Avatar, Button, Card, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import type { Role } from "@prisma/client";
import { ORG_ROLES, roleLabel } from "@/lib/roles";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

type Kpi = {
  id: string;
  title: string;
  description: string | null;
  metricType: string;
  targetValue: number | null;
  weight: number;
  roleFilter: string | null;
  department: { id?: string; name: string } | null;
};

type Cycle = {
  id: string;
  name: string;
  period: string;
  description: string | null;
  status: string;
  startDate: Date | string;
  endDate: Date | string;
  selfReviewDeadline: Date | string | null;
  managerReviewDeadline: Date | string | null;
  includeAllEmployees?: boolean;
  departmentIds?: string[] | string | null;
  roleFilters?: string[] | string | null;
  _count?: { appraisals: number };
  kpis: { kpi: { title: string } }[];
};

type Appraisal = {
  id: string;
  status: string;
  overallRating: number | null;
  selfSubmittedAt: Date | string | null;
  managerSubmittedAt: Date | string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department?: { id?: string; name: string } | null;
  };
  manager: { firstName: string; lastName: string };
  cycle: { name: string; period: string };
};

type Department = { id: string; name: string };

type Stats = {
  activeCycles: number;
  pendingSelf: number;
  pendingManager: number;
  completed: number;
  kpiCount: number;
};

type PerformanceSettings = {
  ratingScaleMax: number;
  announceOnActivate: boolean;
  notifyOnActivate: boolean;
  requireSelfBeforeManager: boolean;
  autoOverallFromKpis: boolean;
};

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "SELF_REVIEW", label: "Self review" },
  { id: "MANAGER_REVIEW", label: "Manager review" },
  { id: "COMPLETED", label: "Completed" },
] as const;

function metricLabel(type: string) {
  const map: Record<string, string> = {
    RATING: "1–5 rating",
    NUMBER: "Number",
    PERCENTAGE: "Percentage",
    BOOLEAN: "Yes / No",
  };
  return map[type] ?? type;
}

function AppraisalProgress({ status }: { status: string }) {
  const steps = [
    { key: "SELF_REVIEW", label: "Self" },
    { key: "MANAGER_REVIEW", label: "Manager" },
    { key: "COMPLETED", label: "Done" },
  ];

  const index =
    status === "NOT_STARTED"
      ? -1
      : status === "SELF_REVIEW"
        ? 0
        : status === "MANAGER_REVIEW"
          ? 1
          : status === "COMPLETED"
            ? 2
            : 0;

  return (
    <div className="flex items-center gap-1 mt-4">
      {steps.map((step, i) => {
        const done = i < index || (i === index && status === "COMPLETED");
        const active = i === index && status !== "COMPLETED";
        return (
          <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full ${
                done ? "bg-emerald-500" : active ? "bg-[#7B61FF]" : "bg-gray-100"
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                done ? "text-emerald-600" : active ? "text-[#7B61FF]" : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const stars = Math.max(3, Math.min(10, max));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < value ? "text-amber-400 fill-amber-400" : "text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export function PerformanceHub({
  kpis,
  cycles,
  appraisals,
  departments,
  canManage,
  canManageSettings,
  isEmployee,
  currentEmployeeId,
  stats,
  settings,
}: {
  kpis: Kpi[];
  cycles: Cycle[];
  appraisals: Appraisal[];
  departments: Department[];
  canManage: boolean;
  canManageSettings: boolean;
  isEmployee: boolean;
  currentEmployeeId?: string;
  stats: Stats;
  settings: PerformanceSettings;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "appraisals" | "cycles" | "kpis" | "insights" | "settings"
  >("appraisals");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [kpiOpen, setKpiOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [kpiForm, setKpiForm] = useState({
    title: "",
    description: "",
    metricType: "RATING",
    targetValue: "",
    weight: "1",
    departmentId: "",
    roleFilter: "",
  });

  const [cycleForm, setCycleForm] = useState({
    name: "",
    period: "",
    description: "",
    startDate: "",
    endDate: "",
    selfReviewDeadline: "",
    managerReviewDeadline: "",
    includeAllEmployees: true,
    departmentIds: [] as string[],
    roleFilters: [] as string[],
    kpiIds: [] as string[],
  });

  const [settingsForm, setSettingsForm] = useState({
    ratingScaleMax: settings.ratingScaleMax,
    announceOnActivate: settings.announceOnActivate,
    notifyOnActivate: settings.notifyOnActivate,
    requireSelfBeforeManager: settings.requireSelfBeforeManager,
    autoOverallFromKpis: settings.autoOverallFromKpis,
  });

  const ratingMax = settings.ratingScaleMax || 5;
  const activeCycle = cycles.find((c) => c.status === "ACTIVE");
  const myAppraisal = isEmployee
    ? appraisals.find((a) => a.employee.id === currentEmployeeId)
    : null;

  const filteredAppraisals = useMemo(() => {
    if (statusFilter === "ALL") return appraisals;
    return appraisals.filter((a) => a.status === statusFilter);
  }, [appraisals, statusFilter]);

  const insights = useMemo(() => {
    const total = appraisals.length;
    const byStatus: Record<string, number> = {};
    for (const a of appraisals) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }
    const completed = byStatus.COMPLETED ?? 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const rated = appraisals.filter((a) => a.overallRating != null);
    const avgRating =
      rated.length > 0
        ? Math.round(
            (rated.reduce((sum, a) => sum + (a.overallRating ?? 0), 0) / rated.length) * 10
          ) / 10
        : null;

    const byCycleStatus: Record<string, number> = {};
    for (const c of cycles) {
      byCycleStatus[c.status] = (byCycleStatus[c.status] ?? 0) + 1;
    }

    const byDepartment: Record<string, number> = {};
    for (const a of appraisals) {
      const name = a.employee.department?.name;
      if (!name) continue;
      byDepartment[name] = (byDepartment[name] ?? 0) + 1;
    }

    return {
      total,
      completed,
      completionRate,
      byStatus,
      avgRating,
      byCycleStatus,
      byDepartment,
      pendingSelf: byStatus.SELF_REVIEW ?? 0,
      pendingManager: byStatus.MANAGER_REVIEW ?? 0,
    };
  }, [appraisals, cycles]);

  const createKpi = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/performance/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kpiForm),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create KPI"));
        return;
      }
      notify.success("KPI created successfully");
      setKpiOpen(false);
      setKpiForm({
        title: "",
        description: "",
        metricType: "RATING",
        targetValue: "",
        weight: "1",
        departmentId: "",
        roleFilter: "",
      });
      router.refresh();
    } catch {
      notify.error("Failed to create KPI");
    } finally {
      setLoading(false);
    }
  };

  const deleteKpi = async (id: string) => {
    if (!confirm("Archive this KPI? It will be hidden from the library.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/performance/kpis/${id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to archive KPI"));
        return;
      }
      notify.success("KPI archived");
      router.refresh();
    } catch {
      notify.error("Failed to archive KPI");
    } finally {
      setLoading(false);
    }
  };

  const createCycle = async () => {
    setLoading(true);
    try {
      const payload = {
        ...cycleForm,
        departmentIds: cycleForm.includeAllEmployees ? [] : cycleForm.departmentIds,
        roleFilters: cycleForm.includeAllEmployees ? [] : cycleForm.roleFilters,
      };
      const res = await fetch("/api/performance/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create review cycle"));
        return;
      }
      notify.success("Review cycle created successfully");
      setCycleOpen(false);
      setCycleForm({
        name: "",
        period: "",
        description: "",
        startDate: "",
        endDate: "",
        selfReviewDeadline: "",
        managerReviewDeadline: "",
        includeAllEmployees: true,
        departmentIds: [],
        roleFilters: [],
        kpiIds: [],
      });
      router.refresh();
    } catch {
      notify.error("Failed to create review cycle");
    } finally {
      setLoading(false);
    }
  };

  const activateCycle = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/performance/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to activate cycle"));
      } else {
        notify.success("Review cycle activated");
        router.refresh();
      }
    } catch {
      notify.error("Failed to activate cycle");
    } finally {
      setLoading(false);
    }
  };

  const closeCycle = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/performance/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to close cycle"));
      } else {
        notify.success("Review cycle closed");
        router.refresh();
      }
    } catch {
      notify.error("Failed to close cycle");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/performance/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settingsForm,
          ratingScaleMax: Math.min(10, Math.max(3, Number(settingsForm.ratingScaleMax) || 5)),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save settings"));
        return;
      }
      notify.success("Performance settings saved");
      router.refresh();
    } catch {
      notify.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: "appraisals" as const,
      label: isEmployee ? "My appraisal" : "Appraisals",
      icon: ClipboardCheck,
    },
    ...(canManage
      ? [{ id: "cycles" as const, label: "Review cycles", icon: CalendarRange }]
      : []),
    ...(canManage ? [{ id: "kpis" as const, label: "KPI library", icon: Target }] : []),
    ...(canManage ? [{ id: "insights" as const, label: "Insights", icon: BarChart3 }] : []),
    ...(canManageSettings
      ? [{ id: "settings" as const, label: "Settings", icon: Settings }]
      : []),
  ];

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {canManage ? (
          <>
            <StatCard label="Active cycles" value={stats.activeCycles} icon={CalendarRange} />
            <StatCard label="Awaiting self-review" value={stats.pendingSelf} icon={UserCheck} />
            <StatCard label="Awaiting manager" value={stats.pendingManager} icon={Users} />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} />
          </>
        ) : (
          <>
            <StatCard label="My reviews" value={appraisals.length} icon={Medal} />
            <StatCard
              label="Pending action"
              value={myAppraisal?.status === "SELF_REVIEW" ? 1 : 0}
              icon={Sparkles}
            />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} />
            <StatCard
              label="Overall rating"
              value={
                myAppraisal?.overallRating != null
                  ? `${myAppraisal.overallRating}/${ratingMax}`
                  : "—"
              }
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      {/* Active cycle banner */}
      {activeCycle && (
        <div className="mb-6 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7B61FF]">
                Active review cycle
              </p>
              <h2 className="text-lg font-bold text-gray-900 mt-1">{activeCycle.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{activeCycle.period}</p>
              <p className="text-xs text-gray-400 mt-2">
                {formatDate(activeCycle.startDate)} – {formatDate(activeCycle.endDate)} ·{" "}
                {activeCycle._count?.appraisals ?? 0} people · {activeCycle.kpis.length} KPIs
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage && (
                <Link href={`/performance/cycles/${activeCycle.id}`}>
                  <Button variant="secondary">View cycle</Button>
                </Link>
              )}
              {myAppraisal && myAppraisal.status === "SELF_REVIEW" && (
                <Link href={`/performance/appraisals/${myAppraisal.id}`}>
                  <Button>
                    Complete self-appraisal
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab shell */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 pt-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-t-xl border-b-2 transition-colors -mb-px ${
                  tab === t.id
                    ? "border-[#7B61FF] text-[#7B61FF] bg-violet-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
          {canManage && tab === "cycles" && (
            <Button onClick={() => setCycleOpen(true)}>
              <Plus className="w-4 h-4" />
              New cycle
            </Button>
          )}
          {canManage && tab === "kpis" && (
            <Button onClick={() => setKpiOpen(true)}>
              <Plus className="w-4 h-4" />
              Create KPI
            </Button>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {/* Appraisals tab */}
          {tab === "appraisals" && (
            <>
              {isEmployee && myAppraisal && (
                <div className="mb-6 rounded-2xl border-2 border-[#7B61FF]/20 bg-violet-50/30 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#7B61FF] uppercase tracking-wide">
                        Your current appraisal
                      </p>
                      <h3 className="text-lg font-bold text-gray-900 mt-1">
                        {myAppraisal.cycle.name}
                      </h3>
                      <p className="text-sm text-gray-500">{myAppraisal.cycle.period}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Reviewer:{" "}
                        {fullName(myAppraisal.manager.firstName, myAppraisal.manager.lastName)}
                      </p>
                      <AppraisalProgress status={myAppraisal.status} />
                    </div>
                    <div className="text-right">
                      {statusBadge(myAppraisal.status)}
                      {myAppraisal.overallRating != null && (
                        <div className="mt-3">
                          <p className="text-2xl font-bold text-emerald-600">
                            {myAppraisal.overallRating}/{ratingMax}
                          </p>
                          <StarRating value={myAppraisal.overallRating} max={ratingMax} />
                        </div>
                      )}
                      <Link
                        href={`/performance/appraisals/${myAppraisal.id}`}
                        className="inline-block mt-4"
                      >
                        <Button>
                          {myAppraisal.status === "SELF_REVIEW"
                            ? "Start self-appraisal"
                            : "View appraisal"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {canManage && !isEmployee && (
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <Filter className="w-4 h-4 text-gray-400" />
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${
                        statusFilter === f.id
                          ? "bg-[#7B61FF] text-white border-[#7B61FF]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-violet-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}

              {filteredAppraisals.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No appraisals yet"
                  description={
                    canManage
                      ? "Create KPIs, open a review cycle, and activate it to enroll your team."
                      : "Appraisals appear here when HR opens a review cycle."
                  }
                />
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 text-[11px] font-semibold text-gray-500 uppercase">
                          {isEmployee ? "Cycle" : "Employee"}
                        </th>
                        {!isEmployee && (
                          <th className="text-left py-3 px-2 text-[11px] font-semibold text-gray-500 uppercase">
                            Cycle
                          </th>
                        )}
                        <th className="text-left py-3 px-2 text-[11px] font-semibold text-gray-500 uppercase">
                          Manager
                        </th>
                        <th className="text-left py-3 px-2 text-[11px] font-semibold text-gray-500 uppercase">
                          Progress
                        </th>
                        <th className="text-left py-3 px-2 text-[11px] font-semibold text-gray-500 uppercase">
                          Rating
                        </th>
                        <th className="text-right py-3 px-2 text-[11px] font-semibold text-gray-500 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAppraisals.map((appraisal) => (
                        <tr key={appraisal.id} className="hover:bg-gray-50/60">
                          <td className="py-3.5 px-2">
                            {!isEmployee ? (
                              <div className="flex items-center gap-3">
                                <Avatar
                                  firstName={appraisal.employee.firstName}
                                  lastName={appraisal.employee.lastName}
                                  size="sm"
                                />
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {fullName(
                                      appraisal.employee.firstName,
                                      appraisal.employee.lastName
                                    )}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-gray-900">
                                  {appraisal.cycle.name}
                                </p>
                                <p className="text-xs text-gray-500">{appraisal.cycle.period}</p>
                              </div>
                            )}
                          </td>
                          {!isEmployee && (
                            <td className="py-3.5 px-2 text-gray-600">
                              <p className="font-medium text-gray-800">{appraisal.cycle.name}</p>
                              <p className="text-xs text-gray-400">{appraisal.cycle.period}</p>
                            </td>
                          )}
                          <td className="py-3.5 px-2 text-gray-600 text-[13px]">
                            {fullName(appraisal.manager.firstName, appraisal.manager.lastName)}
                          </td>
                          <td className="py-3.5 px-2">{statusBadge(appraisal.status)}</td>
                          <td className="py-3.5 px-2">
                            {appraisal.overallRating != null ? (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-emerald-600">
                                  {appraisal.overallRating}/{ratingMax}
                                </span>
                                <StarRating value={appraisal.overallRating} max={ratingMax} />
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            <Link
                              href={`/performance/appraisals/${appraisal.id}`}
                              className="inline-flex items-center gap-1 text-[13px] font-medium text-[#7B61FF] hover:text-violet-700"
                            >
                              {appraisal.status === "SELF_REVIEW" &&
                              appraisal.employee.id === currentEmployeeId
                                ? "Self-review"
                                : appraisal.status === "MANAGER_REVIEW" && canManage
                                  ? "Review"
                                  : "Open"}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Cycles tab */}
          {tab === "cycles" && canManage && (
            <div className="space-y-4">
              {cycles.length === 0 ? (
                <EmptyState
                  icon={CalendarRange}
                  title="No review cycles"
                  description="Start a cycle to run KPI-based appraisals across your organization."
                />
              ) : (
                cycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="rounded-2xl border border-gray-100 p-5 hover:border-violet-100 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[15px] font-semibold text-gray-900">{cycle.name}</h3>
                          {statusBadge(cycle.status)}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{cycle.period}</p>
                        {cycle.description && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {cycle.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-3 text-[12px] text-gray-500">
                          <span>
                            {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
                          </span>
                          <span>{cycle._count?.appraisals ?? 0} people</span>
                          <span>{cycle.kpis.length} KPIs</span>
                          {cycle.includeAllEmployees === false && (
                            <span className="text-[#7B61FF]">Scoped enrollment</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {cycle.kpis.slice(0, 4).map((link) => (
                            <span
                              key={link.kpi.title}
                              className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-medium"
                            >
                              {link.kpi.title}
                            </span>
                          ))}
                          {cycle.kpis.length > 4 && (
                            <span className="text-[11px] text-gray-400">
                              +{cycle.kpis.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <Link href={`/performance/cycles/${cycle.id}`}>
                          <Button variant="secondary" className="w-full sm:w-auto">
                            Details
                          </Button>
                        </Link>
                        {cycle.status === "DRAFT" && (
                          <Button
                            loading={loading}
                            onClick={() => activateCycle(cycle.id)}
                            className="w-full sm:w-auto"
                          >
                            Activate
                          </Button>
                        )}
                        {cycle.status === "ACTIVE" && (
                          <Button
                            variant="secondary"
                            loading={loading}
                            onClick={() => closeCycle(cycle.id)}
                            className="w-full sm:w-auto"
                          >
                            Close
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* KPIs tab */}
          {tab === "kpis" && canManage && (
            <>
              {kpis.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No KPIs defined"
                  description="Create measurable KPIs with targets and conditions before starting a review cycle."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {kpis.map((kpi) => (
                    <div
                      key={kpi.id}
                      className="rounded-2xl border border-gray-100 p-5 hover:border-violet-100 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-50 text-[#7B61FF] shrink-0">
                          <Target className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900">{kpi.title}</h3>
                          {kpi.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {kpi.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          title="Archive KPI"
                          disabled={loading}
                          onClick={() => deleteKpi(kpi.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-2 text-[12px]">
                        <div>
                          <p className="text-gray-400">Metric</p>
                          <p className="font-medium text-gray-800">{metricLabel(kpi.metricType)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Target</p>
                          <p className="font-medium text-gray-800">
                            {kpi.targetValue != null ? kpi.targetValue : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Weight</p>
                          <p className="font-medium text-gray-800">{kpi.weight}x</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Scope</p>
                          <p className="font-medium text-gray-800 truncate">
                            {kpi.department?.name ??
                              (kpi.roleFilter
                                ? roleLabel(kpi.roleFilter as Role)
                                : "Everyone")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Insights tab */}
          {tab === "insights" && canManage && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card className="p-5 border-violet-100 bg-gradient-to-br from-violet-50/60 to-white">
                  <div className="flex items-center gap-2 text-[#7B61FF] mb-2">
                    <Percent className="w-4 h-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">
                      Completion
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{insights.completionRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {insights.completed} of {insights.total} appraisals done
                  </p>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 text-amber-500 mb-2">
                    <Star className="w-4 h-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Avg rating
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {insights.avgRating != null ? insights.avgRating : "—"}
                    {insights.avgRating != null && (
                      <span className="text-base font-medium text-gray-400">/{ratingMax}</span>
                    )}
                  </p>
                  {insights.avgRating != null && (
                    <div className="mt-2">
                      <StarRating value={Math.round(insights.avgRating)} max={ratingMax} />
                    </div>
                  )}
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 text-[#7B61FF] mb-2">
                    <UserCheck className="w-4 h-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Pending self
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{insights.pendingSelf}</p>
                  <p className="text-xs text-gray-500 mt-1">Awaiting employee review</p>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 text-[#7B61FF] mb-2">
                    <Users className="w-4 h-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Pending manager
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{insights.pendingManager}</p>
                  <p className="text-xs text-gray-500 mt-1">Awaiting manager review</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">By appraisal status</h3>
                  {insights.total === 0 ? (
                    <p className="text-sm text-gray-400">No appraisal data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { key: "SELF_REVIEW", label: "Self review" },
                        { key: "MANAGER_REVIEW", label: "Manager review" },
                        { key: "COMPLETED", label: "Completed" },
                        { key: "NOT_STARTED", label: "Not started" },
                      ].map((row) => {
                        const count = insights.byStatus[row.key] ?? 0;
                        const pct =
                          insights.total > 0 ? Math.round((count / insights.total) * 100) : 0;
                        return (
                          <div key={row.key}>
                            <div className="flex items-center justify-between text-[13px] mb-1">
                              <span className="text-gray-700">{row.label}</span>
                              <span className="font-medium text-gray-900">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#7B61FF]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">By cycle status</h3>
                  {cycles.length === 0 ? (
                    <p className="text-sm text-gray-400">No cycles yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {["DRAFT", "ACTIVE", "CLOSED"].map((status) => {
                        const count = insights.byCycleStatus[status] ?? 0;
                        return (
                          <div
                            key={status}
                            className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
                          >
                            <div className="flex items-center gap-2">
                              {statusBadge(status)}
                            </div>
                            <span className="text-lg font-bold text-gray-900">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {Object.keys(insights.byDepartment).length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Appraisals by department
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(insights.byDepartment)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, count]) => (
                        <div
                          key={name}
                          className="rounded-xl border border-gray-100 bg-violet-50/30 px-4 py-3 flex items-center justify-between"
                        >
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {name}
                          </span>
                          <span className="text-sm font-bold text-[#7B61FF]">{count}</span>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Settings tab */}
          {tab === "settings" && canManageSettings && (
            <div className="max-w-2xl space-y-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Performance settings</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Control rating scale, activation announcements, and review workflow rules.
                </p>
              </div>

              <Card className="p-5 space-y-1">
                <label className={labelClass}>Rating scale maximum (3–10)</label>
                <input
                  type="number"
                  min={3}
                  max={10}
                  className={inputClass}
                  value={settingsForm.ratingScaleMax}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      ratingScaleMax: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Overall ratings and KPI rating metrics use this scale.
                </p>
              </Card>

              {(
                [
                  {
                    key: "announceOnActivate" as const,
                    title: "Announce on activate",
                    body: "Post a company announcement when a review cycle is activated.",
                  },
                  {
                    key: "notifyOnActivate" as const,
                    title: "Notify on activate",
                    body: "Send in-app notifications to enrolled employees and managers.",
                  },
                  {
                    key: "requireSelfBeforeManager" as const,
                    title: "Require self-review first",
                    body: "Managers cannot submit until the employee completes self-review.",
                  },
                  {
                    key: "autoOverallFromKpis" as const,
                    title: "Auto-calculate overall from KPIs",
                    body: "Derive overall rating from weighted KPI scores when available.",
                  },
                ] as const
              ).map((item) => (
                <Card key={item.key} className="p-4 bg-violet-50/40 border-violet-100">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.body}</p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-[#7B61FF]"
                      checked={settingsForm[item.key]}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, [item.key]: e.target.checked })
                      }
                    />
                  </label>
                </Card>
              ))}

              <div className="flex justify-end">
                <Button loading={loading} onClick={saveSettings}>
                  Save settings
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Workflow hint for HR */}
      {canManage && tab === "appraisals" && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Define KPIs",
              body: "Set targets, weights, and who they apply to.",
              icon: Target,
            },
            {
              step: "2",
              title: "Open a cycle",
              body: "Link KPIs, set deadlines, and activate enrollment.",
              icon: CalendarRange,
            },
            {
              step: "3",
              title: "Review flow",
              body: "Employees self-appraise, then managers complete reviews.",
              icon: Medal,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-gray-100 bg-white p-4 flex gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-[#7B61FF] flex items-center justify-center text-sm font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create KPI dialog */}
      <Dialog open={kpiOpen} onClose={() => setKpiOpen(false)} title="Create KPI" size="lg">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input
              className={inputClass}
              placeholder="e.g. Delivery quality"
              value={kpiForm.title}
              onChange={(e) => setKpiForm({ ...kpiForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={2}
              value={kpiForm.description}
              onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Metric type</label>
              <select
                className={inputClass}
                value={kpiForm.metricType}
                onChange={(e) => setKpiForm({ ...kpiForm, metricType: e.target.value })}
              >
                <option value="RATING">Rating (1–5)</option>
                <option value="NUMBER">Number</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="BOOLEAN">Yes / No</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Target value</label>
              <input
                className={inputClass}
                value={kpiForm.targetValue}
                onChange={(e) => setKpiForm({ ...kpiForm, targetValue: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Weight</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                className={inputClass}
                value={kpiForm.weight}
                onChange={(e) => setKpiForm({ ...kpiForm, weight: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Department (optional)</label>
              <select
                className={inputClass}
                value={kpiForm.departmentId}
                onChange={(e) => setKpiForm({ ...kpiForm, departmentId: e.target.value })}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Role (optional)</label>
            <select
              className={inputClass}
              value={kpiForm.roleFilter}
              onChange={(e) => setKpiForm({ ...kpiForm, roleFilter: e.target.value })}
            >
              <option value="">All roles</option>
              {ORG_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setKpiOpen(false)}>
            Cancel
          </Button>
          <Button loading={loading} onClick={createKpi}>
            Create KPI
          </Button>
        </div>
      </Dialog>

      {/* Create cycle dialog */}
      <Dialog open={cycleOpen} onClose={() => setCycleOpen(false)} title="New review cycle" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cycle name</label>
              <input
                className={inputClass}
                value={cycleForm.name}
                onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Period</label>
              <input
                className={inputClass}
                placeholder="H1 2026"
                value={cycleForm.period}
                onChange={(e) => setCycleForm({ ...cycleForm, period: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={2}
              value={cycleForm.description}
              onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start date</label>
              <input
                type="date"
                className={inputClass}
                value={cycleForm.startDate}
                onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>End date</label>
              <input
                type="date"
                className={inputClass}
                value={cycleForm.endDate}
                onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Self-review deadline</label>
              <input
                type="date"
                className={inputClass}
                value={cycleForm.selfReviewDeadline}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, selfReviewDeadline: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Manager deadline</label>
              <input
                type="date"
                className={inputClass}
                value={cycleForm.managerReviewDeadline}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, managerReviewDeadline: e.target.value })
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <p className={labelClass}>KPIs in this cycle</p>
            <div className="space-y-2 max-h-36 overflow-y-auto mt-2">
              {kpis.map((kpi) => (
                <label
                  key={kpi.id}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="accent-[#7B61FF]"
                    checked={cycleForm.kpiIds.includes(kpi.id)}
                    onChange={(e) => {
                      setCycleForm({
                        ...cycleForm,
                        kpiIds: e.target.checked
                          ? [...cycleForm.kpiIds, kpi.id]
                          : cycleForm.kpiIds.filter((id) => id !== kpi.id),
                      });
                    }}
                  />
                  {kpi.title}
                </label>
              ))}
              {kpis.length === 0 && <p className="text-xs text-gray-400">Create KPIs first.</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#7B61FF]"
              checked={cycleForm.includeAllEmployees}
              onChange={(e) =>
                setCycleForm({
                  ...cycleForm,
                  includeAllEmployees: e.target.checked,
                  departmentIds: e.target.checked ? [] : cycleForm.departmentIds,
                  roleFilters: e.target.checked ? [] : cycleForm.roleFilters,
                })
              }
            />
            Include all active employees when activated
          </label>

          {!cycleForm.includeAllEmployees && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
                <p className={labelClass}>Departments</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {departments.length === 0 ? (
                    <p className="text-xs text-gray-400">No departments available.</p>
                  ) : (
                    departments.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="accent-[#7B61FF]"
                          checked={cycleForm.departmentIds.includes(d.id)}
                          onChange={(e) => {
                            setCycleForm({
                              ...cycleForm,
                              departmentIds: e.target.checked
                                ? [...cycleForm.departmentIds, d.id]
                                : cycleForm.departmentIds.filter((id) => id !== d.id),
                            });
                          }}
                        />
                        {d.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
                <p className={labelClass}>Roles</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {ORG_ROLES.map((role) => (
                    <label
                      key={role}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="accent-[#7B61FF]"
                        checked={cycleForm.roleFilters.includes(role)}
                        onChange={(e) => {
                          setCycleForm({
                            ...cycleForm,
                            roleFilters: e.target.checked
                              ? [...cycleForm.roleFilters, role]
                              : cycleForm.roleFilters.filter((r) => r !== role),
                          });
                        }}
                      />
                      {roleLabel(role)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setCycleOpen(false)}>
            Cancel
          </Button>
          <Button loading={loading} onClick={createCycle}>
            Create cycle
          </Button>
        </div>
      </Dialog>
    </>
  );
}
