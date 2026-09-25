"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Gauge,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { Button, EmptyState, statusBadge } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { cn, formatDate, fullName, getInitials } from "@/lib/utils";
import { useAppEvents } from "@/hooks/use-app-events";
import {
  computeWeightedOverall,
  normalizeKpiScoreToScale,
  scoreHint,
} from "@/lib/performance/scoring";

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

type KpiScore = {
  id: string;
  kpiId: string;
  selfScore: number | null;
  selfNotes: string | null;
  managerScore: number | null;
  managerNotes: string | null;
  kpi: {
    title: string;
    description: string | null;
    metricType: string;
    targetValue: number | null;
    weight: number;
  };
};

type Appraisal = {
  id: string;
  status: string;
  selfRating: number | null;
  selfAchievements: string | null;
  selfComments: string | null;
  selfSubmittedAt: Date | string | null;
  managerRating: number | null;
  managerFeedback: string | null;
  managerSubmittedAt: Date | string | null;
  overallRating: number | null;
  employee: {
    firstName: string;
    lastName: string;
    avatar?: string | null;
    department?: { name: string } | null;
  };
  manager: { firstName: string; lastName: string };
  cycle: {
    name: string;
    period: string;
    selfReviewDeadline: Date | string | null;
    managerReviewDeadline: Date | string | null;
    kpis?: { kpiId: string; weight: number }[];
  };
  kpiScores: KpiScore[];
  canEditSelf?: boolean;
  canEditManager?: boolean;
};

type TabId = "overview" | "self" | "manager";

type SelfForm = {
  selfRating: string;
  selfAchievements: string;
  selfComments: string;
  kpiScores: { id: string; selfScore: string; selfNotes: string }[];
};

type ManagerForm = {
  managerRating: string;
  managerFeedback: string;
  kpiScores: { id: string; managerScore: string; managerNotes: string }[];
};

const STEPS = [
  { key: "NOT_STARTED", label: "Not started" },
  { key: "SELF_REVIEW", label: "Self review" },
  { key: "MANAGER_REVIEW", label: "Manager review" },
  { key: "COMPLETED", label: "Completed" },
] as const;

function stepIndex(status: string) {
  return STEPS.findIndex((s) => s.key === status);
}

function toNum(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function useNow() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);
  return now;
}

function buildSelfForm(a: Appraisal): SelfForm {
  return {
    selfRating: a.selfRating?.toString() ?? "4",
    selfAchievements: a.selfAchievements ?? "",
    selfComments: a.selfComments ?? "",
    kpiScores: a.kpiScores.map((s) => ({
      id: s.id,
      selfScore: s.selfScore?.toString() ?? "",
      selfNotes: s.selfNotes ?? "",
    })),
  };
}

function buildManagerForm(a: Appraisal): ManagerForm {
  return {
    managerRating: a.managerRating?.toString() ?? "4",
    managerFeedback: a.managerFeedback ?? "",
    kpiScores: a.kpiScores.map((s) => ({
      id: s.id,
      managerScore: s.managerScore?.toString() ?? "",
      managerNotes: s.managerNotes ?? "",
    })),
  };
}

function Bar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cn("h-1.5 w-full bg-gray-200/70 rounded-full overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#7B61FF] to-brand-500 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function RatingDisplay({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-sm text-gray-400">—</span>;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "w-4 h-4",
            i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-200"
          )}
        />
      ))}
      <span className="text-sm font-bold text-gray-700 ml-1 tabular-nums">
        {value}/{max}
      </span>
    </div>
  );
}

function DeadlinePill({
  label,
  deadline,
  submittedAt,
}: {
  label: string;
  deadline: Date | string | null;
  submittedAt: Date | string | null;
}) {
  const now = useNow();
  if (submittedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Submitted {formatDate(submittedAt)}
      </span>
    );
  }
  if (!deadline) return null;

  const due = new Date(deadline);
  const overdue = due.getTime() <= now;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
        overdue ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50"
      )}
    >
      <Clock className="w-3.5 h-3.5" />
      {label} {overdue ? "overdue · was due" : "due"} {formatDate(deadline)}
    </span>
  );
}

function ProgressStepper({ status }: { status: string }) {
  const current = stepIndex(status);

  return (
    <ol className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
      {STEPS.map((step, index) => {
        const done = index < current || status === "COMPLETED";
        const active = index === current && status !== "COMPLETED";
        const completed = status === "COMPLETED";

        return (
          <li key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2",
                  done || completed
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : active
                      ? "bg-[#7B61FF] border-[#7B61FF] text-white"
                      : "bg-white border-gray-200 text-gray-400"
                )}
              >
                {done || completed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium truncate",
                  active
                    ? "text-[#7B61FF]"
                    : done || completed
                      ? "text-emerald-700"
                      : "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "hidden sm:block flex-1 h-0.5 mx-3",
                  index < current || status === "COMPLETED" ? "bg-emerald-300" : "bg-gray-200"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function NormChip({
  score,
  metricType,
  targetValue,
  scaleMax,
}: {
  score: number | null;
  metricType: string;
  targetValue: number | null;
  scaleMax: number;
}) {
  if (score == null) return <span className="text-sm text-gray-300">—</span>;
  const norm = normalizeKpiScoreToScale(score, metricType, scaleMax, targetValue);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full tabular-nums">
      {norm.toFixed(1)}/{scaleMax}
    </span>
  );
}

function LiveScoreChip({
  raw,
  metricType,
  targetValue,
  scaleMax,
}: {
  raw: string;
  metricType: string;
  targetValue: number | null;
  scaleMax: number;
}) {
  const n = toNum(raw);
  if (n == null) return null;
  const norm = normalizeKpiScoreToScale(n, metricType, scaleMax, targetValue);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full tabular-nums">
      <TrendingUp className="w-3 h-3" />
      {norm.toFixed(1)}/{scaleMax}
    </span>
  );
}

function PreviewCard({
  overall,
  scaleMax,
  note,
}: {
  overall: number | null;
  scaleMax: number;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-brand-50/60 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-white border border-violet-200 text-violet-600 flex items-center justify-center shrink-0">
        <Gauge className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Projected overall rating</p>
        <p className="text-xs text-gray-500 mt-0.5">{note}</p>
      </div>
      <div className="shrink-0 w-full sm:w-48">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-3xl font-extrabold text-violet-700 tabular-nums">
            {overall != null ? overall : "—"}
            <span className="text-sm font-medium text-gray-400"> / {scaleMax}</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Live</span>
        </div>
        <Bar value={overall ?? 0} max={scaleMax} />
      </div>
    </div>
  );
}

function ScorePanel({
  accent,
  label,
  value,
  max,
}: {
  accent: string;
  label: string;
  value: number | null;
  max: number;
}) {
  const n = value ?? 0;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className={cn("text-[11px] font-bold uppercase tracking-wide", accent)}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-gray-900 tabular-nums">
        {value != null ? value : "—"}
        <span className="text-sm font-medium text-gray-400"> / {max}</span>
      </p>
      <Bar value={n} max={max} className="mt-3" />
    </div>
  );
}

function ReadBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Award;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function KpiComparisonTable({
  scores,
  scaleMax,
}: {
  scores: KpiScore[];
  scaleMax: number;
}) {
  if (scores.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No KPIs assigned for this cycle.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              KPI
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 w-20">
              Target
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase tracking-wide text-violet-600 w-24">
              Self
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase tracking-wide text-brand-600 w-28">
              Manager
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase tracking-wide text-gray-400 w-24">
              Normalized
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {scores.map((score) => (
            <tr key={score.id} className="hover:bg-gray-50/50">
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">{score.kpi.title}</p>
                {score.kpi.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{score.kpi.description}</p>
                )}
              </td>
              <td className="py-3 px-3 text-center text-gray-600 tabular-nums">
                {score.kpi.targetValue ?? "—"}
              </td>
              <td className="py-3 px-3 text-center font-semibold text-violet-700 tabular-nums">
                {score.selfScore ?? "—"}
              </td>
              <td className="py-3 px-3 text-center font-semibold text-brand-700 tabular-nums">
                {score.managerScore ?? "—"}
              </td>
              <td className="py-3 px-3 text-center">
                <NormChip
                  score={score.managerScore ?? score.selfScore}
                  metricType={score.kpi.metricType}
                  targetValue={score.kpi.targetValue}
                  scaleMax={scaleMax}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AppraisalDetailModule({
  appraisal: initial,
  canEditSelf: initialCanEditSelf,
  canEditManager: initialCanEditManager,
  viewerIsEmployee = false,
  ratingScaleMax,
}: {
  appraisal: Appraisal;
  canEditSelf: boolean;
  canEditManager: boolean;
  viewerIsEmployee?: boolean;
  ratingScaleMax?: number;
}) {
  const [appraisal, setAppraisal] = useState<Appraisal>(initial);
  const [canEditSelf, setCanEditSelf] = useState(initialCanEditSelf);
  const [canEditManager, setCanEditManager] = useState(initialCanEditManager);
  const [scaleMax, setScaleMax] = useState(
    ratingScaleMax && Number(ratingScaleMax) > 0 ? Number(ratingScaleMax) : 5
  );
  const [saving, setSaving] = useState<"self" | "manager" | null>(null);

  const selfDirty = useRef(false);
  const managerDirty = useRef(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selfForm, setSelfForm] = useState<SelfForm>(() => buildSelfForm(initial));
  const [managerForm, setManagerForm] = useState<ManagerForm>(() =>
    buildManagerForm(initial)
  );

  const defaultTab = useMemo((): TabId => {
    if (canEditManager) return "manager";
    if (canEditSelf) return "self";
    if (appraisal.status === "MANAGER_REVIEW") return viewerIsEmployee ? "self" : "overview";
    return "overview";
  }, [canEditManager, canEditSelf, appraisal.status, viewerIsEmployee]);

  const [tab, setTab] = useState<TabId>(defaultTab);

  const employeeName = fullName(appraisal.employee.firstName, appraisal.employee.lastName);
  const managerName = fullName(appraisal.manager.firstName, appraisal.manager.lastName);

  const weightFor = useCallback(
    (score: KpiScore | undefined) => {
      if (!score) return 1;
      return (
        appraisal.cycle.kpis?.find((l) => l.kpiId === score.kpiId)?.weight ??
        score.kpi.weight ??
        1
      );
    },
    [appraisal.cycle.kpis]
  );

  const refreshScaleMax = useCallback(async () => {
    try {
      const res = await fetch("/api/performance/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (data && Number(data.ratingScaleMax) > 0) {
        setScaleMax(Number(data.ratingScaleMax));
      }
    } catch {
      /* ignore transient failures */
    }
  }, []);

  const applySnapshot = useCallback((data: Appraisal) => {
    setAppraisal(data);
    setCanEditSelf(data.canEditSelf ?? false);
    setCanEditManager(data.canEditManager ?? false);
    if (!selfDirty.current) setSelfForm(buildSelfForm(data));
    if (!managerDirty.current) setManagerForm(buildManagerForm(data));
  }, []);

  const reload = useCallback(() => {
    if (reloadTimer.current) return;
    reloadTimer.current = setTimeout(async () => {
      reloadTimer.current = null;
      try {
        const res = await fetch(`/api/performance/appraisals/${initial.id}`);
        if (!res.ok) return;
        const data = await res.json();
        applySnapshot(data);
      } catch {
        /* ignore transient failures */
      }
    }, 400);
  }, [applySnapshot, initial.id]);

  useAppEvents({
    types: ["appraisal_updated", "performance_updated", "notification_updated"],
    onEvent: reload,
  });

  useAppEvents({
    types: ["settings_updated"],
    onEvent: refreshScaleMax,
  });

  useEffect(() => {
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, []);

  const saveSelf = async (submit: boolean) => {
    setSaving("self");
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "self",
          submit,
          selfRating: toNum(selfForm.selfRating),
          selfAchievements: selfForm.selfAchievements,
          selfComments: selfForm.selfComments,
          kpiScores: selfForm.kpiScores.map((s) => ({
            id: s.id,
            selfScore: toNum(s.selfScore),
            selfNotes: s.selfNotes,
          })),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save self-appraisal"));
        return;
      }
      const data: Appraisal = await res.json();
      notify.success(submit ? "Self-appraisal submitted" : "Draft saved");
      selfDirty.current = false;
      setAppraisal(data);
      setSelfForm(buildSelfForm(data));
      reload();
    } catch {
      notify.error("Failed to save self-appraisal");
    } finally {
      setSaving(null);
    }
  };

  const saveManager = async (submit: boolean) => {
    setSaving("manager");
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "manager",
          submit,
          managerRating: toNum(managerForm.managerRating),
          managerFeedback: managerForm.managerFeedback,
          kpiScores: managerForm.kpiScores.map((s) => ({
            id: s.id,
            managerScore: toNum(s.managerScore),
            managerNotes: s.managerNotes,
          })),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save manager review"));
        return;
      }
      const data: Appraisal = await res.json();
      notify.success(submit ? "Review completed" : "Draft saved");
      managerDirty.current = false;
      setAppraisal(data);
      setManagerForm(buildManagerForm(data));
      reload();
    } catch {
      notify.error("Failed to save manager review");
    } finally {
      setSaving(null);
    }
  };

  const selfPreview = useMemo(() => {
    const scores = selfForm.kpiScores.map((row) => {
      const meta = appraisal.kpiScores.find((s) => s.id === row.id);
      return {
        selfScore: toNum(row.selfScore),
        managerScore: null,
        weight: weightFor(meta),
        metricType: meta?.kpi.metricType ?? "RATING",
        targetValue: meta?.kpi.targetValue ?? null,
      };
    });
    return computeWeightedOverall(scores, scaleMax);
  }, [selfForm.kpiScores, appraisal.kpiScores, scaleMax, weightFor]);

  const managerPreview = useMemo(() => {
    const scores = managerForm.kpiScores.map((row) => {
      const meta = appraisal.kpiScores.find((s) => s.id === row.id);
      return {
        selfScore: meta?.selfScore ?? null,
        managerScore: toNum(row.managerScore),
        weight: weightFor(meta),
        metricType: meta?.kpi.metricType ?? "RATING",
        targetValue: meta?.kpi.targetValue ?? null,
      };
    });
    return computeWeightedOverall(scores, scaleMax);
  }, [managerForm.kpiScores, appraisal.kpiScores, scaleMax, weightFor]);

  const tabs: { id: TabId; label: string; icon: typeof Target; locked?: boolean }[] = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "self", label: "Self-appraisal", icon: UserRound, locked: !canEditSelf },
    { id: "manager", label: "Manager review", icon: Users, locked: !canEditManager },
  ];

  const nextAction = (() => {
    if (canEditSelf) {
      return {
        tone: "violet" as const,
        title: "Complete your self-appraisal",
        body: "Rate each KPI and submit before the deadline so your manager can review.",
      };
    }
    if (canEditManager) {
      return {
        tone: "brand" as const,
        title: "Manager review required",
        body: `Review ${employeeName}'s self-appraisal, score each KPI, and submit your feedback.`,
      };
    }
    if (appraisal.status === "MANAGER_REVIEW" && !appraisal.managerSubmittedAt) {
      return {
        tone: "amber" as const,
        title: viewerIsEmployee ? "Waiting on your manager" : "Awaiting manager review",
        body: viewerIsEmployee
          ? `Your self-appraisal was submitted${appraisal.selfSubmittedAt ? ` on ${formatDate(appraisal.selfSubmittedAt)}` : ""}. ${managerName} will complete the manager review.`
          : `${employeeName} submitted their self-appraisal. The manager review is pending.`,
      };
    }
    if (appraisal.status === "COMPLETED") {
      return {
        tone: "emerald" as const,
        title: "Review completed",
        body: `Final rating: ${appraisal.overallRating ?? appraisal.managerRating ?? "—"}/${scaleMax}`,
      };
    }
    return null;
  })();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B61FF] to-brand-500 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">
              {getInitials(appraisal.employee.firstName, appraisal.employee.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{employeeName}</h1>
                {statusBadge(appraisal.status)}
              </div>
              <p className="text-sm text-gray-600">
                {appraisal.cycle.name} · <span className="font-medium">{appraisal.cycle.period}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {appraisal.employee.department?.name ?? "No department"} · Manager: {managerName}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <DeadlinePill
                  label="Self review"
                  deadline={appraisal.cycle.selfReviewDeadline}
                  submittedAt={appraisal.selfSubmittedAt}
                />
                <DeadlinePill
                  label="Manager review"
                  deadline={appraisal.cycle.managerReviewDeadline}
                  submittedAt={appraisal.managerSubmittedAt}
                />
              </div>
            </div>
            {appraisal.overallRating != null && (
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Overall</p>
                <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                  {appraisal.overallRating}
                  <span className="text-sm font-medium text-gray-400">/{scaleMax}</span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <ProgressStepper status={appraisal.status} />
          </div>
        </div>
      </article>

      {nextAction && (
        <div
          className={cn(
            "rounded-2xl border px-5 py-4 mb-6 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
            nextAction.tone === "violet" && "border-violet-200 bg-violet-50 text-violet-900",
            nextAction.tone === "brand" && "border-brand-200 bg-brand-50 text-brand-900",
            nextAction.tone === "amber" && "border-amber-200 bg-amber-50 text-amber-900",
            nextAction.tone === "emerald" && "border-emerald-200 bg-emerald-50 text-emerald-900"
          )}
        >
          <div>
            <p className="font-semibold">{nextAction.title}</p>
            <p className="mt-0.5 opacity-90">{nextAction.body}</p>
          </div>
          {canEditManager && (
            <Button size="sm" className="shrink-0" onClick={() => setTab("manager")}>
              Start manager review
            </Button>
          )}
          {canEditSelf && (
            <Button size="sm" className="shrink-0" onClick={() => setTab("self")}>
              Continue self-appraisal
            </Button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
        {tabs.map(({ id, label, icon: Icon, locked }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
              tab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            {locked && <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ScorePanel
              accent="text-violet-600"
              label="Self rating"
              value={appraisal.selfRating}
              max={scaleMax}
            />
            <ScorePanel
              accent="text-brand-600"
              label="Manager rating"
              value={appraisal.managerRating}
              max={scaleMax}
            />
            <ScorePanel
              accent="text-emerald-600"
              label="Overall rating"
              value={appraisal.overallRating ?? appraisal.managerRating}
              max={scaleMax}
            />
          </div>

          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#7B61FF]" />
              <h2 className="text-sm font-semibold text-gray-900">KPI scoreboard</h2>
              <span className="text-xs text-gray-400 ml-1">normalized to a {scaleMax} scale</span>
            </div>
            <KpiComparisonTable scores={appraisal.kpiScores} scaleMax={scaleMax} />
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600 mb-2">
                  Self rating
                </p>
                <RatingDisplay value={appraisal.selfRating} max={scaleMax} />
                {appraisal.selfSubmittedAt && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Submitted {formatDate(appraisal.selfSubmittedAt)}
                  </p>
                )}
              </div>
              {appraisal.selfAchievements && (
                <ReadBlock icon={Award} title="Achievements">
                  {appraisal.selfAchievements}
                </ReadBlock>
              )}
              {appraisal.selfComments && (
                <ReadBlock icon={MessageSquare} title="Comments">
                  {appraisal.selfComments}
                </ReadBlock>
              )}
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600 mb-2">
                  Manager rating
                </p>
                <RatingDisplay value={appraisal.managerRating} max={scaleMax} />
                {appraisal.managerSubmittedAt ? (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Submitted {formatDate(appraisal.managerSubmittedAt)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">Not submitted yet</p>
                )}
              </div>
              {appraisal.managerFeedback && (
                <ReadBlock icon={MessageSquare} title="Manager feedback">
                  {appraisal.managerFeedback}
                </ReadBlock>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Self tab */}
      {tab === "self" && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Self-appraisal</h2>
              <p className="text-xs text-gray-500 mt-0.5">Employee self-assessment for this cycle</p>
            </div>
            <DeadlinePill
              label="Self review"
              deadline={appraisal.cycle.selfReviewDeadline}
              submittedAt={appraisal.selfSubmittedAt}
            />
          </div>

          {canEditSelf ? (
            <div className="space-y-5">
              <PreviewCard
                overall={selfPreview}
                scaleMax={scaleMax}
                note="Computed live from the self scores you enter, weighted by each KPI."
              />

              {appraisal.kpiScores.length === 0 ? (
                <EmptyState
                  icon={UserRound}
                  title="No KPIs assigned"
                  description="No KPI targets are attached to this cycle yet."
                />
              ) : (
                appraisal.kpiScores.map((score, index) => (
                  <div key={score.id} className="rounded-2xl border border-gray-200 bg-gray-50/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{score.kpi.title}</p>
                        {score.kpi.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{score.kpi.description}</p>
                        )}
                        {score.kpi.targetValue != null && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            Target: {score.kpi.targetValue}
                          </p>
                        )}
                      </div>
                      <LiveScoreChip
                        raw={selfForm.kpiScores[index]?.selfScore ?? ""}
                        metricType={score.kpi.metricType}
                        targetValue={score.kpi.targetValue}
                        scaleMax={scaleMax}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <input
                          className={`${inputClass} tabular-nums`}
                          inputMode="decimal"
                          placeholder="Score"
                          value={selfForm.kpiScores[index]?.selfScore ?? ""}
                          onChange={(e) => {
                            selfDirty.current = true;
                            const next = [...selfForm.kpiScores];
                            next[index] = { ...next[index], selfScore: e.target.value };
                            setSelfForm({ ...selfForm, kpiScores: next });
                          }}
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                          {scoreHint(score.kpi.metricType, scaleMax)}
                        </p>
                      </div>
                      <input
                        className={inputClass}
                        placeholder="Notes"
                        value={selfForm.kpiScores[index]?.selfNotes ?? ""}
                        onChange={(e) => {
                          selfDirty.current = true;
                          const next = [...selfForm.kpiScores];
                          next[index] = { ...next[index], selfNotes: e.target.value };
                          setSelfForm({ ...selfForm, kpiScores: next });
                        }}
                      />
                    </div>
                  </div>
                ))
              )}

              <textarea
                className={inputClass}
                rows={3}
                placeholder="Key achievements this period"
                value={selfForm.selfAchievements}
                onChange={(e) => {
                  selfDirty.current = true;
                  setSelfForm({ ...selfForm, selfAchievements: e.target.value });
                }}
              />
              <textarea
                className={inputClass}
                rows={2}
                placeholder="Additional comments"
                value={selfForm.selfComments}
                onChange={(e) => {
                  selfDirty.current = true;
                  setSelfForm({ ...selfForm, selfComments: e.target.value });
                }}
              />
              <div>
                <label className={labelClass}>Overall self-rating</label>
                <select
                  className={`${inputClass} mt-1 max-w-xs`}
                  value={selfForm.selfRating}
                  onChange={(e) => {
                    selfDirty.current = true;
                    setSelfForm({ ...selfForm, selfRating: e.target.value });
                  }}
                >
                  {Array.from({ length: scaleMax }, (_, i) => scaleMax - i).map((n) => (
                    <option key={n} value={n}>
                      {n} / {scaleMax}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="secondary" loading={saving === "self"} onClick={() => saveSelf(false)}>
                  Save draft
                </Button>
                <Button loading={saving === "self"} onClick={() => saveSelf(true)}>
                  Submit self-appraisal
                </Button>
              </div>
            </div>
          ) : appraisal.selfSubmittedAt ? (
            <div className="space-y-4">
              <PreviewCard
                overall={appraisal.selfRating}
                scaleMax={scaleMax}
                note={`Self score you submitted on ${formatDate(appraisal.selfSubmittedAt)}.`}
              />
              {appraisal.selfAchievements && (
                <ReadBlock icon={Award} title="Achievements">
                  {appraisal.selfAchievements}
                </ReadBlock>
              )}
              {appraisal.selfComments && (
                <ReadBlock icon={MessageSquare} title="Comments">
                  {appraisal.selfComments}
                </ReadBlock>
              )}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">
                  KPI scores
                </p>
                <KpiComparisonTable scores={appraisal.kpiScores} scaleMax={scaleMax} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
              Self-appraisal not submitted yet.
            </p>
          )}
        </section>
      )}

      {/* Manager tab */}
      {tab === "manager" && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Manager review</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {canEditManager
                  ? `Review ${employeeName}'s performance and submit feedback`
                  : `Assessment by ${managerName}`}
              </p>
            </div>
            <DeadlinePill
              label="Manager review"
              deadline={appraisal.cycle.managerReviewDeadline}
              submittedAt={appraisal.managerSubmittedAt}
            />
          </div>

          {canEditManager ? (
            <div className="space-y-5">
              <PreviewCard
                overall={managerPreview}
                scaleMax={scaleMax}
                note="Computed live from the manager scores you enter, weighted by each KPI."
              />
              {!appraisal.selfSubmittedAt && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  Employee has not submitted their self-appraisal yet. You can still save a draft review.
                </p>
              )}
              {appraisal.kpiScores.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No KPIs assigned"
                  description="No KPI targets are attached to this cycle yet."
                />
              ) : (
                appraisal.kpiScores.map((score, index) => (
                  <div key={score.id} className="rounded-2xl border border-gray-200 bg-gray-50/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{score.kpi.title}</p>
                        {score.kpi.targetValue != null && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            Target: {score.kpi.targetValue}
                          </p>
                        )}
                      </div>
                      <LiveScoreChip
                        raw={managerForm.kpiScores[index]?.managerScore ?? ""}
                        metricType={score.kpi.metricType}
                        targetValue={score.kpi.targetValue}
                        scaleMax={scaleMax}
                      />
                    </div>
                    {score.selfScore != null && (
                      <div className="mt-2.5 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-xs text-violet-700">
                        <span className="font-semibold">Employee:</span> {score.selfScore}
                        {score.selfNotes ? ` — ${score.selfNotes}` : ""}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <input
                          className={`${inputClass} tabular-nums`}
                          inputMode="decimal"
                          placeholder="Manager score"
                          value={managerForm.kpiScores[index]?.managerScore ?? ""}
                          onChange={(e) => {
                            managerDirty.current = true;
                            const next = [...managerForm.kpiScores];
                            next[index] = { ...next[index], managerScore: e.target.value };
                            setManagerForm({ ...managerForm, kpiScores: next });
                          }}
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                          {scoreHint(score.kpi.metricType, scaleMax)}
                        </p>
                      </div>
                      <input
                        className={inputClass}
                        placeholder="Manager notes"
                        value={managerForm.kpiScores[index]?.managerNotes ?? ""}
                        onChange={(e) => {
                          managerDirty.current = true;
                          const next = [...managerForm.kpiScores];
                          next[index] = { ...next[index], managerNotes: e.target.value };
                          setManagerForm({ ...managerForm, kpiScores: next });
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
              <textarea
                className={inputClass}
                rows={4}
                placeholder="Manager feedback summary"
                value={managerForm.managerFeedback}
                onChange={(e) => {
                  managerDirty.current = true;
                  setManagerForm({ ...managerForm, managerFeedback: e.target.value });
                }}
              />
              <div>
                <label className={labelClass}>Overall manager rating</label>
                <select
                  className={`${inputClass} mt-1 max-w-xs`}
                  value={managerForm.managerRating}
                  onChange={(e) => {
                    managerDirty.current = true;
                    setManagerForm({ ...managerForm, managerRating: e.target.value });
                  }}
                >
                  {Array.from({ length: scaleMax }, (_, i) => scaleMax - i).map((n) => (
                    <option key={n} value={n}>
                      {n} / {scaleMax}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="secondary"
                  loading={saving === "manager"}
                  onClick={() => saveManager(false)}
                >
                  Save draft
                </Button>
                <Button loading={saving === "manager"} onClick={() => saveManager(true)}>
                  Complete review
                </Button>
              </div>
            </div>
          ) : appraisal.managerSubmittedAt ? (
            <div className="space-y-4">
              <PreviewCard
                overall={appraisal.managerRating}
                scaleMax={scaleMax}
                note={`Manager score submitted on ${formatDate(appraisal.managerSubmittedAt)}.`}
              />
              {appraisal.managerFeedback && (
                <ReadBlock icon={MessageSquare} title="Manager feedback">
                  {appraisal.managerFeedback}
                </ReadBlock>
              )}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">
                  KPI scores
                </p>
                <KpiComparisonTable scores={appraisal.kpiScores} scaleMax={scaleMax} />
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">Manager review pending</p>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                {appraisal.selfSubmittedAt
                  ? `${managerName} has not completed the review yet.${viewerIsEmployee ? " You'll be notified when it's done." : ""}`
                  : "Waiting for the employee to submit their self-appraisal first."}
              </p>
              {appraisal.selfSubmittedAt && (
                <p className="text-xs text-gray-400 mt-3">
                  Self-appraisal submitted {formatDate(appraisal.selfSubmittedAt)}
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}