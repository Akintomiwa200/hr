"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  Medal,
  Plus,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Avatar, Button, Card, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
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
  department: { name: string } | null;
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
  _count?: { appraisals: number };
  kpis: { kpi: { title: string } }[];
};

type Appraisal = {
  id: string;
  status: string;
  overallRating: number | null;
  selfSubmittedAt: Date | string | null;
  managerSubmittedAt: Date | string | null;
  employee: { id: string; firstName: string; lastName: string };
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

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
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
  isEmployee,
  currentEmployeeId,
  stats,
}: {
  kpis: Kpi[];
  cycles: Cycle[];
  appraisals: Appraisal[];
  departments: Department[];
  canManage: boolean;
  isEmployee: boolean;
  currentEmployeeId?: string;
  stats: Stats;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"appraisals" | "cycles" | "kpis">("appraisals");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [kpiOpen, setKpiOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    kpiIds: [] as string[],
  });

  const activeCycle = cycles.find((c) => c.status === "ACTIVE");
  const myAppraisal = isEmployee
    ? appraisals.find((a) => a.employee.id === currentEmployeeId)
    : null;

  const filteredAppraisals = useMemo(() => {
    if (statusFilter === "ALL") return appraisals;
    return appraisals.filter((a) => a.status === statusFilter);
  }, [appraisals, statusFilter]);

  const createKpi = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/performance/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kpiForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setKpiOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const createCycle = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/performance/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cycleForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCycleOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const activateCycle = async (id: string) => {
    setLoading(true);
    await fetch(`/api/performance/cycles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate" }),
    });
    router.refresh();
    setLoading(false);
  };

  const tabs = [
    { id: "appraisals" as const, label: isEmployee ? "My appraisal" : "Appraisals", icon: ClipboardCheck },
    ...(canManage ? [{ id: "cycles" as const, label: "Review cycles", icon: CalendarRange }] : []),
    ...(canManage ? [{ id: "kpis" as const, label: "KPI library", icon: Target }] : []),
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
            <StatCard label="Pending action" value={myAppraisal?.status === "SELF_REVIEW" ? 1 : 0} icon={Sparkles} />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} />
            <StatCard label="Overall rating" value={myAppraisal?.overallRating ? `${myAppraisal.overallRating}/5` : "—"} icon={TrendingUp} />
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
                      <h3 className="text-lg font-bold text-gray-900 mt-1">{myAppraisal.cycle.name}</h3>
                      <p className="text-sm text-gray-500">{myAppraisal.cycle.period}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Reviewer: {fullName(myAppraisal.manager.firstName, myAppraisal.manager.lastName)}
                      </p>
                      <AppraisalProgress status={myAppraisal.status} />
                    </div>
                    <div className="text-right">
                      {statusBadge(myAppraisal.status)}
                      {myAppraisal.overallRating != null && (
                        <div className="mt-3">
                          <p className="text-2xl font-bold text-emerald-600">{myAppraisal.overallRating}/5</p>
                          <StarRating value={myAppraisal.overallRating} />
                        </div>
                      )}
                      <Link href={`/performance/appraisals/${myAppraisal.id}`} className="inline-block mt-4">
                        <Button>
                          {myAppraisal.status === "SELF_REVIEW" ? "Start self-appraisal" : "View appraisal"}
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
                                    {fullName(appraisal.employee.firstName, appraisal.employee.lastName)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-gray-900">{appraisal.cycle.name}</p>
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
                                <span className="font-semibold text-emerald-600">{appraisal.overallRating}/5</span>
                                <StarRating value={appraisal.overallRating} />
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
                              {appraisal.status === "SELF_REVIEW" && appraisal.employee.id === currentEmployeeId
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
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{cycle.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-3 text-[12px] text-gray-500">
                          <span>{formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}</span>
                          <span>{cycle._count?.appraisals ?? 0} people</span>
                          <span>{cycle.kpis.length} KPIs</span>
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
                            <span className="text-[11px] text-gray-400">+{cycle.kpis.length - 4} more</span>
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
                          <Button loading={loading} onClick={() => activateCycle(cycle.id)} className="w-full sm:w-auto">
                            Activate
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
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900">{kpi.title}</h3>
                          {kpi.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{kpi.description}</p>
                          )}
                        </div>
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
                            {kpi.department?.name ?? kpi.roleFilter ?? "Everyone"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Workflow hint for HR */}
      {canManage && tab === "appraisals" && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Define KPIs", body: "Set targets, weights, and who they apply to.", icon: Target },
            { step: "2", title: "Open a cycle", body: "Link KPIs, set deadlines, and activate enrollment.", icon: CalendarRange },
            { step: "3", title: "Review flow", body: "Employees self-appraise, then managers complete reviews.", icon: Medal },
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
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input className={inputClass} placeholder="e.g. Delivery quality" value={kpiForm.title} onChange={(e) => setKpiForm({ ...kpiForm, title: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea className={inputClass} rows={2} value={kpiForm.description} onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Metric type</label>
              <select className={inputClass} value={kpiForm.metricType} onChange={(e) => setKpiForm({ ...kpiForm, metricType: e.target.value })}>
                <option value="RATING">Rating (1–5)</option>
                <option value="NUMBER">Number</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="BOOLEAN">Yes / No</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Target value</label>
              <input className={inputClass} value={kpiForm.targetValue} onChange={(e) => setKpiForm({ ...kpiForm, targetValue: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Department (optional)</label>
              <select className={inputClass} value={kpiForm.departmentId} onChange={(e) => setKpiForm({ ...kpiForm, departmentId: e.target.value })}>
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Role (optional)</label>
              <select className={inputClass} value={kpiForm.roleFilter} onChange={(e) => setKpiForm({ ...kpiForm, roleFilter: e.target.value })}>
                <option value="">All roles</option>
                <option value="EMPLOYEE">Employees</option>
                <option value="MANAGER">Managers</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setKpiOpen(false)}>Cancel</Button>
          <Button loading={loading} onClick={createKpi}>Create KPI</Button>
        </div>
      </Dialog>

      {/* Create cycle dialog */}
      <Dialog open={cycleOpen} onClose={() => setCycleOpen(false)} title="New review cycle" size="lg">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cycle name</label>
              <input className={inputClass} value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Period</label>
              <input className={inputClass} placeholder="H1 2026" value={cycleForm.period} onChange={(e) => setCycleForm({ ...cycleForm, period: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea className={inputClass} rows={2} value={cycleForm.description} onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start date</label>
              <input type="date" className={inputClass} value={cycleForm.startDate} onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>End date</label>
              <input type="date" className={inputClass} value={cycleForm.endDate} onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Self-review deadline</label>
              <input type="date" className={inputClass} value={cycleForm.selfReviewDeadline} onChange={(e) => setCycleForm({ ...cycleForm, selfReviewDeadline: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Manager deadline</label>
              <input type="date" className={inputClass} value={cycleForm.managerReviewDeadline} onChange={(e) => setCycleForm({ ...cycleForm, managerReviewDeadline: e.target.value })} />
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <p className={labelClass}>KPIs in this cycle</p>
            <div className="space-y-2 max-h-36 overflow-y-auto mt-2">
              {kpis.map((kpi) => (
                <label key={kpi.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
              onChange={(e) => setCycleForm({ ...cycleForm, includeAllEmployees: e.target.checked })}
            />
            Include all active employees when activated
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setCycleOpen(false)}>Cancel</Button>
          <Button loading={loading} onClick={createCycle}>Create cycle</Button>
        </div>
      </Dialog>
    </>
  );
}
