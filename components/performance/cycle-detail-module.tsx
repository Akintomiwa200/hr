"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  Play,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { Button, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { cn, formatDate, fullName, getInitials } from "@/lib/utils";
import { useAppEvents } from "@/hooks/use-app-events";

type KpiLink = {
  id: string;
  kpiId: string;
  weight: number;
  kpi: {
    id: string;
    title: string;
    description: string | null;
    metricType: string;
    targetValue: number | null;
  };
};

type Appraisal = {
  id: string;
  status: string;
  overallRating: number | null;
  selfSubmittedAt: Date | string | null;
  managerSubmittedAt: Date | string | null;
  employee: {
    firstName: string;
    lastName: string;
    avatar?: string | null;
    department?: { name: string } | null;
  };
  manager: { firstName: string; lastName: string };
  kpiScores?: {
    id: string;
    selfScore: number | null;
    managerScore: number | null;
    kpi: { title: string };
  }[];
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
  includeAllEmployees: boolean;
  departmentIds?: string | string[] | null;
  roleFilters?: string | string[] | null;
  kpis: KpiLink[];
  appraisals: Appraisal[];
};

function parseArray(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const STEPS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "SELF_REVIEW", label: "Self" },
  { value: "MANAGER_REVIEW", label: "Manager" },
  { value: "COMPLETED", label: "Done" },
] as const;

function stepIndex(status: string) {
  return STEPS.findIndex((s) => s.value === status);
}

function MetricChip({ type, targetValue }: { type: string; targetValue: number | null }) {
  const meta: Record<string, { label: string; cls: string }> = {
    RATING: { label: "Rating", cls: "bg-violet-50 text-violet-700 border-violet-200" },
    PERCENTAGE: { label: "Percentage", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    BOOLEAN: { label: "Yes/No", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    NUMBER: { label: "Number", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };
  const m = meta[type] ?? { label: type, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
        m.cls
      )}
    >
      {m.label}
      {targetValue != null && <span className="opacity-70">· {targetValue}</span>}
    </span>
  );
}

function StatusProgress({ status }: { status: string }) {
  const current = Math.max(0, stepIndex(status));
  return (
    <div className="flex items-center gap-1.5 w-full max-w-[130px]">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            status === "COMPLETED" ? "bg-emerald-500" : "bg-[#7B61FF]"
          )}
          style={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-gray-500 tabular-nums">
        {current + 1}/{STEPS.length}
      </span>
    </div>
  );
}

type Department = { id: string; name: string };

export function CycleDetailModule({
  cycle: initial,
  canManage = false,
  ratingScaleMax = 5,
  departments = [],
}: {
  cycle: Cycle;
  canManage?: boolean;
  ratingScaleMax?: number;
  departments?: Department[];
}) {
  const [cycle, setCycle] = useState<Cycle>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(() => {
    if (reloadTimer.current) return;
    reloadTimer.current = setTimeout(async () => {
      reloadTimer.current = null;
      try {
        const res = await fetch(`/api/performance/cycles/${initial.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.id) setCycle(data);
      } catch {
        /* ignore transient failures */
      }
    }, 400);
  }, [initial.id]);

  useAppEvents({
    types: ["performance_updated", "appraisal_updated", "notification_updated"],
    onEvent: reload,
  });

  useEffect(() => {
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, []);

  const runAction = async (action: "activate" | "close") => {
    setBusy(action);
    try {
      const res = await fetch(`/api/performance/cycles/${cycle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Action failed"));
        return;
      }
      notify.success(
        action === "activate" ? "Review cycle activated" : "Review cycle closed"
      );
      reload();
    } catch {
      notify.error("Action failed");
    } finally {
      setBusy(null);
    }
  };

  const deptFilter = parseArray(cycle.departmentIds);
  const roleFilter = parseArray(cycle.roleFilters);

  const stats = useMemo(() => {
    const total = cycle.appraisals.length;
    const notStarted = cycle.appraisals.filter((a) => a.status === "NOT_STARTED").length;
    const selfReview = cycle.appraisals.filter((a) => a.status === "SELF_REVIEW").length;
    const managerReview = cycle.appraisals.filter((a) => a.status === "MANAGER_REVIEW").length;
    const completed = cycle.appraisals.filter((a) => a.status === "COMPLETED").length;
    const rated = cycle.appraisals
      .map((a) => a.overallRating)
      .filter((v): v is number => v != null);
    const avg = rated.length > 0 ? rated.reduce((s, v) => s + v, 0) / rated.length : null;
    return { total, notStarted, selfReview, managerReview, completed, avg };
  }, [cycle.appraisals]);

  const canActivate = cycle.status === "DRAFT" && cycle.kpis.length > 0;
  const isActive = cycle.status === "ACTIVE";
  const isClosed = cycle.status === "CLOSED";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Link
          href="/performance"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to performance
        </Link>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
          <Activity className="w-3 h-3" />
          Live updates
        </span>
      </div>

      {/* Header */}
      <article className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="h-1.5 bg-gradient-to-r from-[#7B61FF] to-brand-500" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B61FF] to-brand-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{cycle.name}</h1>
                {statusBadge(cycle.status)}
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600" />
                    </span>
                    In progress
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {cycle.period} · {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {cycle.selfReviewDeadline && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                    <Calendar className="w-3.5 h-3.5" />
                    Self review due {formatDate(cycle.selfReviewDeadline)}
                  </span>
                )}
                {cycle.managerReviewDeadline && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full">
                    <Calendar className="w-3.5 h-3.5" />
                    Manager review due {formatDate(cycle.managerReviewDeadline)}
                  </span>
                )}
              </div>
            </div>
            {canManage && !isClosed && (
              <div className="shrink-0 flex flex-col sm:items-end gap-2">
                {isActive ? (
                  <Button
                    variant="secondary"
                    loading={busy === "close"}
                    onClick={() => runAction("close")}
                  >
                    <XCircle className="w-4 h-4" />
                    Close cycle
                  </Button>
                ) : (
                  <Button
                    loading={busy === "activate"}
                    onClick={() => runAction("activate")}
                    disabled={cycle.kpis.length === 0}
                  >
                    <Play className="w-4 h-4" />
                    Activate cycle
                  </Button>
                )}
                {canActivate && (
                  <p className="text-[11px] text-gray-400">
                    Activation creates appraisals for eligible employees.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-6">
        <StatCard label="People" value={stats.total} icon={Users} />
        <StatCard label="Not started" value={stats.notStarted} icon={ClipboardList} />
        <StatCard label="Self review" value={stats.selfReview} icon={Users} />
        <StatCard label="Awaiting manager" value={stats.managerReview} icon={Clock} />
        <StatCard
          label="Avg score"
          value={stats.avg != null ? `${stats.avg}/${ratingScaleMax}` : "—"}
          icon={BarChart3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* KPI panel */}
        <section className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Attached KPIs</h2>
            <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full tabular-nums">
              {cycle.kpis.length}
            </span>
          </div>
          {cycle.kpis.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No KPIs yet"
              description="Attach KPIs before activating this cycle so employees have targets to score."
            />
          ) : (
            <ul className="space-y-2.5">
              {cycle.kpis.map((link) => (
                <li
                  key={link.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{link.kpi.title}</p>
                    <span className="text-[11px] font-semibold text-brand-700 shrink-0 tabular-nums">
                      x{link.weight}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <MetricChip type={link.kpi.metricType} targetValue={link.kpi.targetValue} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Enrollment panel */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Enrollment</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-gray-50/60 border border-gray-100 p-3.5">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                Audience
              </dt>
              <dd className="font-medium text-gray-800">
                {cycle.includeAllEmployees ? "All active employees" : "Filtered selection"}
              </dd>
            </div>
            <div className="rounded-xl bg-gray-50/60 border border-gray-100 p-3.5">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                Cycle dates
              </dt>
              <dd className="font-medium text-gray-800">
                {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
              </dd>
            </div>
            {(deptFilter.length > 0 || roleFilter.length > 0) && (
              <div className="rounded-xl bg-gray-50/60 border border-gray-100 p-3.5 sm:col-span-2">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">
                  Filters
                </dt>
                <dd className="flex flex-wrap gap-1.5">
                  {deptFilter.map((d) => {
                    const name = departments.find((dep) => dep.id === d)?.name;
                    return (
                      <span
                        key={d}
                        className="text-[11px] font-medium text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full"
                      >
                        {name ?? d}
                      </span>
                    );
                  })}
                  {roleFilter.map((r) => (
                    <span
                      key={r}
                      className="text-[11px] font-medium text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full"
                    >
                      {r}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
          {cycle.description && (
            <p className="text-sm text-gray-600 mt-4 leading-relaxed whitespace-pre-wrap">
              {cycle.description}
            </p>
          )}
        </section>
      </div>

      {/* People */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">People involved</h2>
            <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full tabular-nums">
              {stats.total}
            </span>
          </div>
          {stats.completed > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {stats.completed} complete
              </span>
              {stats.total > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="tabular-nums">
                    {Math.round((stats.completed / stats.total) * 100)}% done
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {cycle.appraisals.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Users}
              title="No appraisals yet"
              description={
                cycle.status === "DRAFT"
                  ? "Activate the cycle to generate appraisals for eligible employees."
                  : "No appraisals were generated for this cycle."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70">
                  <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Appraisee
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Department
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Manager
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Progress
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cycle.appraisals.map((appraisal) => (
                  <tr key={appraisal.id} className="hover:bg-gray-50/40">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(
                            appraisal.employee.firstName,
                            appraisal.employee.lastName
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {fullName(
                              appraisal.employee.firstName,
                              appraisal.employee.lastName
                            )}
                          </p>
                          {appraisal.overallRating != null && (
                            <p className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                              Rated {appraisal.overallRating}/{ratingScaleMax}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {appraisal.employee.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {fullName(appraisal.manager.firstName, appraisal.manager.lastName)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusProgress status={appraisal.status} />
                    </td>
                    <td className="px-4 py-3.5">{statusBadge(appraisal.status)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/performance/appraisals/${appraisal.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
                      >
                        Open
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {busy && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {busy === "activate" ? "Activating cycle…" : "Closing cycle…"}
        </div>
      )}
    </div>
  );
}