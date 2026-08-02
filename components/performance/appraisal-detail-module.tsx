"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, statusBadge } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30";

type KpiScore = {
  id: string;
  selfScore: number | null;
  selfNotes: string | null;
  managerScore: number | null;
  managerNotes: string | null;
  kpi: { title: string; description: string | null; metricType: string; targetValue: number | null };
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
  cycle: { name: string; period: string; selfReviewDeadline: Date | string | null; managerReviewDeadline: Date | string | null };
  kpiScores: KpiScore[];
};

export function AppraisalDetailModule({
  appraisal,
  canEditSelf,
  canEditManager,
}: {
  appraisal: Appraisal;
  canEditSelf: boolean;
  canEditManager: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
      notify.success(submit ? "Self-appraisal submitted" : "Self-appraisal draft saved");
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
      notify.success(submit ? "Manager review completed" : "Manager review draft saved");
      router.refresh();
    } catch {
      notify.error("Failed to save manager review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/performance" className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to performance
      </Link>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {fullName(appraisal.employee.firstName, appraisal.employee.lastName)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {appraisal.cycle.name} · {appraisal.cycle.period}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {appraisal.employee.department.name} · Manager:{" "}
              {fullName(appraisal.manager.firstName, appraisal.manager.lastName)}
            </p>
          </div>
          <div className="text-right">
            {statusBadge(appraisal.status)}
            {appraisal.overallRating != null && (
              <p className="text-lg font-bold text-emerald-600 mt-2">{appraisal.overallRating}/5</p>
            )}
          </div>
        </div>
      </Card>

      {/* Self appraisal */}
      <Card className="p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Self-appraisal</h2>
        <p className="text-xs text-gray-500 mb-4">
          {appraisal.selfSubmittedAt
            ? `Submitted ${formatDate(appraisal.selfSubmittedAt)}`
            : appraisal.cycle.selfReviewDeadline
              ? `Due by ${formatDate(appraisal.cycle.selfReviewDeadline)}`
              : "Complete your self-assessment"}
        </p>

        {canEditSelf ? (
          <div className="space-y-4">
            {appraisal.kpiScores.map((score, index) => (
              <div key={score.id} className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-medium text-gray-900">{score.kpi.title}</p>
                {score.kpi.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{score.kpi.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3">
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
            <select
              className={inputClass}
              value={selfForm.selfRating}
              onChange={(e) => setSelfForm({ ...selfForm, selfRating: e.target.value })}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>Overall self-rating: {n}/5</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="secondary" loading={loading} onClick={() => saveSelf(false)}>
                Save draft
              </Button>
              <Button loading={loading} onClick={() => saveSelf(true)}>
                Submit self-appraisal
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            {appraisal.selfAchievements && <p><strong>Achievements:</strong> {appraisal.selfAchievements}</p>}
            {appraisal.selfComments && <p><strong>Comments:</strong> {appraisal.selfComments}</p>}
            {appraisal.selfRating && <p><strong>Self-rating:</strong> {appraisal.selfRating}/5</p>}
            {!appraisal.selfSubmittedAt && <p className="text-gray-400">Not submitted yet.</p>}
          </div>
        )}
      </Card>

      {/* Manager review */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Manager review</h2>
        <p className="text-xs text-gray-500 mb-4">
          {appraisal.managerSubmittedAt
            ? `Submitted ${formatDate(appraisal.managerSubmittedAt)}`
            : appraisal.cycle.managerReviewDeadline
              ? `Due by ${formatDate(appraisal.cycle.managerReviewDeadline)}`
              : "Manager assessment"}
        </p>

        {canEditManager ? (
          <div className="space-y-4">
            {appraisal.kpiScores.map((score, index) => (
              <div key={score.id} className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-medium text-gray-900">{score.kpi.title}</p>
                {score.selfScore != null && (
                  <p className="text-xs text-violet-600 mt-0.5">Self score: {score.selfScore}</p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3">
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
              rows={3}
              placeholder="Manager feedback"
              value={managerForm.managerFeedback}
              onChange={(e) => setManagerForm({ ...managerForm, managerFeedback: e.target.value })}
            />
            <select
              className={inputClass}
              value={managerForm.managerRating}
              onChange={(e) => setManagerForm({ ...managerForm, managerRating: e.target.value })}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>Overall manager rating: {n}/5</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="secondary" loading={loading} onClick={() => saveManager(false)}>
                Save draft
              </Button>
              <Button loading={loading} onClick={() => saveManager(true)}>
                Complete review
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            {appraisal.managerFeedback && <p>{appraisal.managerFeedback}</p>}
            {appraisal.managerRating && <p><strong>Rating:</strong> {appraisal.managerRating}/5</p>}
            {!appraisal.managerSubmittedAt && appraisal.status !== "COMPLETED" && (
              <p className="text-gray-400">Awaiting manager review.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
