"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  GraduationCap,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";
import { readApiError } from "@/lib/toast";
import {
  LearningEmpty,
  LearningError,
  LearningPanel,
  LearningProgress,
  LearningSkeleton,
  LearningStat,
  LearningStatus,
  formatLearningDate,
  learningSelect,
} from "@/components/training/learning-ui";
import type { LearningAnalytics } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

export function LearningAnalyticsView() {
  const [data, setData] = useState<LearningAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/training/analytics", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Learning analytics could not be loaded.")
        );
      }
      setData((await response.json()) as LearningAnalytics);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Learning analytics could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load(true));
  }, [load]);
  useAppEvents({ types: ["training_updated"], onEvent: () => void load(false) });
  useRealtimeStatus((connected) => {
    if (connected) void load(false);
  });

  const courses = useMemo(() => {
    if (!data) return [];
    if (courseFilter === "ALL") return data.byCourse;
    return data.byCourse.filter((item) => item.courseId === courseFilter);
  }, [data, courseFilter]);

  const departments = useMemo(() => {
    if (!data) return [];
    if (departmentFilter === "ALL") return data.byDepartment;
    return data.byDepartment.filter((item) => item.department === departmentFilter);
  }, [data, departmentFilter]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Course", "Assignments", "Completed", "In progress", "Completion %", "Average progress %"],
      ...data.byCourse.map((item) => [
        item.title,
        item.assignments,
        item.completed,
        item.inProgress,
        item.completionRate,
        item.averageProgress,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `learning-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <LearningError message={error} retry={() => void load(true)} />;
  if (!data || loading) return <LearningSkeleton rows={4} />;

  const { totals, byStatus, recentCompletions } = data;
  const statusTotal = byStatus.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-5 pb-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <LearningStat icon={Users} label="Learners" value={String(totals.learners)} hint={`${totals.assignments} assignments`} />
        <LearningStat icon={CheckCircle2} label="Completed" value={String(totals.completed)} hint={`${totals.completionRate}% completion`} />
        <LearningStat icon={Clock3} label="In progress" value={String(totals.inProgress)} hint={`${totals.overdue} overdue`} />
        <LearningStat icon={GraduationCap} label="Training hours" value={`${totals.trainingHours}h`} hint="Completed courses" />
        <LearningStat
          icon={Star}
          label="Feedback"
          value={totals.feedbackAverage ? `${totals.feedbackAverage}/5` : "—"}
          hint={totals.averageScore !== null ? `Avg score ${totals.averageScore}%` : "No scores yet"}
        />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <LearningPanel
            title="Course performance"
            description="Completion and average progress for every course with assignments."
            icon={BarChart3}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={`${learningSelect} w-auto text-xs`}
                  value={courseFilter}
                  onChange={(event) => setCourseFilter(event.target.value)}
                  aria-label="Filter by course"
                >
                  <option value="ALL">All courses</option>
                  {data.byCourse.map((item) => (
                    <option key={item.courseId} value={item.courseId}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              </div>
            }
          >
            {courses.length === 0 ? (
              <LearningEmpty
                icon={BookOpen}
                title="No course data yet"
                description="Assign and start courses to see completion analytics here."
              />
            ) : (
              <div className="overflow-x-auto">
                <div className="hidden min-w-[720px] grid-cols-[minmax(0,1.6fr)_90px_90px_100px_minmax(0,1fr)] gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 lg:grid">
                  <span>Course</span>
                  <span>Assigned</span>
                  <span>Completed</span>
                  <span>Rate</span>
                  <span>Average progress</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {courses.map((item) => (
                    <div
                      key={item.courseId}
                      className="grid min-w-[720px] gap-2 px-4 py-3 lg:grid-cols-[minmax(0,1.6fr)_90px_90px_100px_minmax(0,1fr)] lg:items-center lg:gap-4"
                    >
                      <Link
                        href={`/training/creator/courses/${item.courseId}`}
                        className="truncate text-sm font-semibold text-gray-900 hover:text-violet-700"
                      >
                        {item.title}
                      </Link>
                      <span className="text-sm tabular-nums text-gray-600">{item.assignments}</span>
                      <span className="text-sm tabular-nums text-gray-600">{item.completed}</span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          item.completionRate >= 80
                            ? "text-emerald-600"
                            : item.completionRate >= 40
                              ? "text-amber-600"
                              : "text-rose-600"
                        )}
                      >
                        {item.completionRate}%
                      </span>
                      <div className="flex items-center gap-2">
                        <LearningProgress value={item.averageProgress} className="flex-1" />
                        <span className="w-9 text-right text-xs tabular-nums text-gray-500">
                          {item.averageProgress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </LearningPanel>

          <LearningPanel
            title="Department completion"
            description="How each team is progressing through assigned learning."
            icon={Building2}
            action={
              <select
                className={`${learningSelect} w-auto text-xs`}
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                aria-label="Filter by department"
              >
                <option value="ALL">All departments</option>
                {data.byDepartment.map((item) => (
                  <option key={item.department} value={item.department}>
                    {item.department}
                  </option>
                ))}
              </select>
            }
          >
            {departments.length === 0 ? (
              <LearningEmpty
                icon={Building2}
                title="No department data yet"
                description="Assign learning to employees with departments to compare teams."
              />
            ) : (
              <div className="space-y-3">
                {departments.map((item) => (
                  <div key={item.department}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{item.department}</span>
                      <span className="text-gray-500">
                        {item.completed}/{item.assignments} complete ·{" "}
                        <span className="font-semibold text-gray-900">{item.completionRate}%</span>
                      </span>
                    </div>
                    <LearningProgress
                      value={item.completionRate}
                      tone={item.completionRate >= 80 ? "emerald" : item.completionRate >= 40 ? "violet" : "amber"}
                      className="mt-1.5"
                    />
                  </div>
                ))}
              </div>
            )}
          </LearningPanel>
        </div>

        <div className="space-y-5">
          <LearningPanel title="Status breakdown" description="Where every assignment stands right now." icon={TrendingUp}>
            {byStatus.length === 0 ? (
              <p className="text-sm text-gray-500">No assignments yet.</p>
            ) : (
              <div className="space-y-3">
                {byStatus.map((item) => {
                  const percent = statusTotal > 0 ? Math.round((item.count / statusTotal) * 100) : 0;
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between text-xs">
                        <LearningStatus value={item.status} />
                        <span className="text-gray-500">
                          {item.count} · {percent}%
                        </span>
                      </div>
                      <LearningProgress
                        value={percent}
                        tone={
                          item.status === "COMPLETED"
                            ? "emerald"
                            : item.status === "IN_PROGRESS"
                              ? "violet"
                              : "amber"
                        }
                        className="mt-1.5"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </LearningPanel>

          <LearningPanel title="Recent completions" description="The latest courses finished by learners." icon={Award}>
            {recentCompletions.length === 0 ? (
              <p className="text-sm text-gray-500">No completions yet.</p>
            ) : (
              <div className="space-y-2">
                {recentCompletions.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">{item.employee}</p>
                    <p className="text-[11px] text-gray-500">
                      {item.course} · {formatLearningDate(item.completedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </LearningPanel>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-sm text-violet-900">
            <p className="font-semibold">Live analytics</p>
            <p className="mt-1 text-violet-800">
              Figures update automatically whenever a course, assignment or lesson changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
