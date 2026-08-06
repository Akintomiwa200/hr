"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Star,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { Button, statusBadge } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { cn, formatDate, fullName, getInitials } from "@/lib/utils";

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

type KpiScore = {
  id: string;
  selfScore: number | null;
  selfNotes: string | null;
  managerScore: number | null;
  managerNotes: string | null;
  kpi: {
    title: string;
    description: string | null;
    metricType: string;
    targetValue: number | null;
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
  employee: { firstName: string; lastName: string; department: { name: string } };
  manager: { firstName: string; lastName: string };
  cycle: {
    name: string;
    period: string;
    selfReviewDeadline: Date | string | null;
    managerReviewDeadline: Date | string | null;
  };
  kpiScores: KpiScore[];
};

type TabId = "overview" | "self" | "manager";

const STEPS = [
  { key: "NOT_STARTED", label: "Not started" },
  { key: "SELF_REVIEW", label: "Self review" },
  { key: "MANAGER_REVIEW", label: "Manager review" },
  { key: "COMPLETED", label: "Completed" },
] as const;

function stepIndex(status: string) {
  return STEPS.findIndex((s) => s.key === status);
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
            i < value ? "fill-amber-400 text-amber-400" : "text-gray-200"
          )}
        />
      ))}
      <span className="text-sm font-semibold text-gray-700 ml-1">{value}/{max}</span>
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
  const overdue = due.getTime() < Date.now();

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
        const completed = status === "COMPLETED" && index <= 3;

        return (
          <li key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2",
                  done || completed
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : active
                      ? "bg-violet-600 border-violet-600 text-white"
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
                  active ? "text-violet-700" : done || completed ? "text-emerald-700" : "text-gray-400"
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

function KpiComparisonTable({ scores }: { scores: KpiScore[] }) {
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
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 w-24">
              Target
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase tracking-wide text-violet-600 w-28">
              Self
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase tracking-wide text-brand-600 w-28">
              Manager
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
                {(score.selfNotes || score.managerNotes) && (
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                    {score.selfNotes || score.managerNotes}
                  </p>
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
            </tr>
          ))}
        </tbody>
      </table>
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
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="text-sm text-gray-800 leading-relaxed">{children}</div>
    </div>
  );
}

export function AppraisalDetailModule({
  appraisal,
  canEditSelf,
  canEditManager,
  viewerIsEmployee = false,
}: {
  appraisal: Appraisal;
  canEditSelf: boolean;
  canEditManager: boolean;
  viewerIsEmployee?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaultTab = useMemo((): TabId => {
    if (canEditManager) return "manager";
    if (canEditSelf) return "self";
    if (appraisal.status === "MANAGER_REVIEW") return viewerIsEmployee ? "self" : "manager";
    if (appraisal.status === "COMPLETED") return "overview";
    return "overview";
  }, [canEditManager, canEditSelf, appraisal.status, viewerIsEmployee]);

  const [tab, setTab] = useState<TabId>(defaultTab);

  const [selfForm, setSelfForm] = useState({
    selfRating: appraisal.selfRating?.toString() ?? "4",
    selfAchievements: appraisal.selfAchievements ?? "",
    selfComments: appraisal.selfComments ?? "",
    kpiScores: appraisal.kpiScores.map((s) => ({
      id: s.id,
      selfScore: s.selfScore?.toString() ?? "",
      selfNotes: s.selfNotes ?? "",
    })),
  });

  const [managerForm, setManagerForm] = useState({
    managerRating: appraisal.managerRating?.toString() ?? "4",
    managerFeedback: appraisal.managerFeedback ?? "",
    kpiScores: appraisal.kpiScores.map((s) => ({
      id: s.id,
      managerScore: s.managerScore?.toString() ?? "",
      managerNotes: s.managerNotes ?? "",
    })),
  });

  const employeeName = fullName(appraisal.employee.firstName, appraisal.employee.lastName);
  const managerName = fullName(appraisal.manager.firstName, appraisal.manager.lastName);

  const saveSelf = async (submit: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "self",
          submit,
          selfRating: selfForm.selfRating,
          selfAchievements: selfForm.selfAchievements,
          selfComments: selfForm.selfComments,
          kpiScores: selfForm.kpiScores.map((s) => ({
            id: s.id,
            selfScore: s.selfScore || null,
            selfNotes: s.selfNotes,
          })),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save self-appraisal"));
        return;
      }
      notify.success(submit ? "Self-appraisal submitted" : "Draft saved");
      router.refresh();
    } catch {
      notify.error("Failed to save self-appraisal");
    } finally {
      setLoading(false);
    }
  };

  const saveManager = async (submit: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "manager",
          submit,
          managerRating: managerForm.managerRating,
          managerFeedback: managerForm.managerFeedback,
          kpiScores: managerForm.kpiScores.map((s) => ({
            id: s.id,
            managerScore: s.managerScore || null,
            managerNotes: s.managerNotes,
          })),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save manager review"));
        return;
      }
      notify.success(submit ? "Review completed" : "Draft saved");
      router.refresh();
    } catch {
      notify.error("Failed to save manager review");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: typeof Target }[] = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "self", label: "Self-appraisal", icon: UserRound },
    { id: "manager", label: "Manager review", icon: Users },
  ];

  const nextAction = (() => {
    if (canEditSelf) {
      return {
        tone: "violet" as const,
        title: "Complete your self-appraisal",
        body: "Rate your KPIs and submit before the deadline so your manager can review.",
      };
    }
    if (canEditManager) {
      return {
        tone: "brand" as const,
        title: "Manager review required",
        body: `Review ${employeeName}'s self-appraisal, score KPIs, and submit your feedback.`,
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
        body: `Final rating: ${appraisal.overallRating ?? appraisal.managerRating ?? "—"}/5`,
      };
    }
    return null;
  })();

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/performance"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to performance
      </Link>

      {/* Header */}
      <article className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="h-1.5 bg-gradient-to-r from-violet-600 to-brand-500" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-lg font-bold shrink-0">
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
                {appraisal.employee.department.name} · Manager: {managerName}
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
                <p className="text-3xl font-extrabold text-emerald-600">{appraisal.overallRating}/5</p>
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
            "rounded-xl border px-4 py-3 mb-6 text-sm",
            nextAction.tone === "violet" && "border-violet-200 bg-violet-50 text-violet-900",
            nextAction.tone === "brand" && "border-brand-200 bg-brand-50 text-brand-900",
            nextAction.tone === "amber" && "border-amber-200 bg-amber-50 text-amber-900",
            nextAction.tone === "emerald" && "border-emerald-200 bg-emerald-50 text-emerald-900"
          )}
        >
          <p className="font-semibold">{nextAction.title}</p>
          <p className="mt-1 opacity-90">{nextAction.body}</p>
          {canEditManager && (
            <Button size="sm" className="mt-3" onClick={() => setTab("manager")}>
              Start manager review
            </Button>
          )}
          {canEditSelf && (
            <Button size="sm" className="mt-3" onClick={() => setTab("self")}>
              Continue self-appraisal
            </Button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
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
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">KPI summary</h2>
            <KpiComparisonTable scores={appraisal.kpiScores} />
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600 mb-2">Self rating</p>
              <RatingDisplay value={appraisal.selfRating} />
              {appraisal.selfSubmittedAt && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Submitted {formatDate(appraisal.selfSubmittedAt)}
                </p>
              )}
            </section>
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600 mb-2">Manager rating</p>
              <RatingDisplay value={appraisal.managerRating} />
              {appraisal.managerSubmittedAt ? (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Submitted {formatDate(appraisal.managerSubmittedAt)}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-2">Not submitted yet</p>
              )}
            </section>
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
              {appraisal.kpiScores.map((score, index) => (
                <div key={score.id} className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-900">{score.kpi.title}</p>
                  {score.kpi.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{score.kpi.description}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <input
                      className={inputClass}
                      placeholder={`Score${score.kpi.targetValue ? ` (target ${score.kpi.targetValue})` : ""}`}
                      value={selfForm.kpiScores[index]?.selfScore ?? ""}
                      onChange={(e) => {
                        const next = [...selfForm.kpiScores];
                        next[index] = { ...next[index], selfScore: e.target.value };
                        setSelfForm({ ...selfForm, kpiScores: next });
                      }}
                    />
                    <input
                      className={inputClass}
                      placeholder="Notes"
                      value={selfForm.kpiScores[index]?.selfNotes ?? ""}
                      onChange={(e) => {
                        const next = [...selfForm.kpiScores];
                        next[index] = { ...next[index], selfNotes: e.target.value };
                        setSelfForm({ ...selfForm, kpiScores: next });
                      }}
                    />
                  </div>
                </div>
              ))}
              <textarea
                className={inputClass}
                rows={3}
                placeholder="Key achievements this period"
                value={selfForm.selfAchievements}
                onChange={(e) => setSelfForm({ ...selfForm, selfAchievements: e.target.value })}
              />
              <textarea
                className={inputClass}
                rows={2}
                placeholder="Additional comments"
                value={selfForm.selfComments}
                onChange={(e) => setSelfForm({ ...selfForm, selfComments: e.target.value })}
              />
              <div>
                <label className="text-xs font-medium text-gray-600">Overall self-rating</label>
                <select
                  className={`${inputClass} mt-1 max-w-xs`}
                  value={selfForm.selfRating}
                  onChange={(e) => setSelfForm({ ...selfForm, selfRating: e.target.value })}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} / 5</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="secondary" loading={loading} onClick={() => saveSelf(false)}>
                  Save draft
                </Button>
                <Button loading={loading} onClick={() => saveSelf(true)}>
                  Submit self-appraisal
                </Button>
              </div>
            </div>
          ) : appraisal.selfSubmittedAt ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
                <span className="text-sm font-medium text-violet-900">Overall self-rating</span>
                <RatingDisplay value={appraisal.selfRating} />
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
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">KPI scores</p>
                <KpiComparisonTable scores={appraisal.kpiScores} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">Self-appraisal not submitted yet.</p>
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
              {!appraisal.selfSubmittedAt && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  Employee has not submitted their self-appraisal yet. You can still save a draft review.
                </p>
              )}
              {appraisal.kpiScores.map((score, index) => (
                <div key={score.id} className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-900">{score.kpi.title}</p>
                  {score.selfScore != null && (
                    <p className="text-xs text-violet-600 mt-0.5">
                      Employee scored: {score.selfScore}
                      {score.selfNotes ? ` — ${score.selfNotes}` : ""}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <input
                      className={inputClass}
                      placeholder="Manager score"
                      value={managerForm.kpiScores[index]?.managerScore ?? ""}
                      onChange={(e) => {
                        const next = [...managerForm.kpiScores];
                        next[index] = { ...next[index], managerScore: e.target.value };
                        setManagerForm({ ...managerForm, kpiScores: next });
                      }}
                    />
                    <input
                      className={inputClass}
                      placeholder="Manager notes"
                      value={managerForm.kpiScores[index]?.managerNotes ?? ""}
                      onChange={(e) => {
                        const next = [...managerForm.kpiScores];
                        next[index] = { ...next[index], managerNotes: e.target.value };
                        setManagerForm({ ...managerForm, kpiScores: next });
                      }}
                    />
                  </div>
                </div>
              ))}
              <textarea
                className={inputClass}
                rows={4}
                placeholder="Manager feedback summary"
                value={managerForm.managerFeedback}
                onChange={(e) => setManagerForm({ ...managerForm, managerFeedback: e.target.value })}
              />
              <div>
                <label className="text-xs font-medium text-gray-600">Overall manager rating</label>
                <select
                  className={`${inputClass} mt-1 max-w-xs`}
                  value={managerForm.managerRating}
                  onChange={(e) => setManagerForm({ ...managerForm, managerRating: e.target.value })}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} / 5</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="secondary" loading={loading} onClick={() => saveManager(false)}>
                  Save draft
                </Button>
                <Button loading={loading} onClick={() => saveManager(true)}>
                  Complete review
                </Button>
              </div>
            </div>
          ) : appraisal.managerSubmittedAt ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
                <span className="text-sm font-medium text-brand-900">Manager rating</span>
                <RatingDisplay value={appraisal.managerRating} />
              </div>
              {appraisal.managerFeedback && (
                <ReadBlock icon={MessageSquare} title="Manager feedback">
                  {appraisal.managerFeedback}
                </ReadBlock>
              )}
              <KpiComparisonTable scores={appraisal.kpiScores} />
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
