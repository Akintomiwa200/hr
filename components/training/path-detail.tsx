"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Compass,
  Layers3,
  Pencil,
  PlayCircle,
  Route,
} from "lucide-react";
import { useLearningWorkspace } from "@/components/training/use-learning-workspace";
import {
  LearningEmpty,
  LearningError,
  LearningPanel,
  LearningProgress,
  LearningSkeleton,
  LearningStatus,
  courseFormatLabel,
  courseLevelLabel,
  formatLearningDuration,
} from "@/components/training/learning-ui";
import { errorMessage, learningAction } from "@/components/training/learning-actions";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function PathDetail({ pathId }: { pathId: string }) {
  const { data, loading, error, reload } = useLearningWorkspace();
  const [busy, setBusy] = useState(false);

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data || loading) return <LearningSkeleton rows={4} />;

  const path = data.paths.find((item) => item.id === pathId);
  if (!path) {
    return (
      <LearningEmpty
        icon={Compass}
        title="Learning path not found"
        description="This path may have been removed or is not available to you."
        action={
          <Link
            href="/training/paths"
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Back to paths
          </Link>
        }
      />
    );
  }

  const courses = (path.courses ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);
  const myAssignments = data.assignments.filter(
    (item) => item.pathId === path.id && item.employeeId === data.access.employeeId
  );
  const completed = myAssignments.filter((item) => item.status === "COMPLETED").length;
  const progress =
    courses.length > 0 ? Math.round((completed / courses.length) * 100) : 0;
  const totalMinutes = courses.reduce(
    (sum, item) => sum + (item.course.durationMinutes ?? 0),
    0
  );
  const notEnrolled = courses.length > 0 && myAssignments.length === 0;

  const enroll = async () => {
    setBusy(true);
    try {
      const result = await learningAction<{ count: number }>({
        action: "path.enroll",
        pathId: path.id,
      });
      notify.success(
        `You are enrolled in ${result.count} course${result.count === 1 ? "" : "s"}.`
      );
      await reload(false);
    } catch (enrollError) {
      notify.error(errorMessage(enrollError, "You could not be enrolled in this path."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <Link
        href="/training/paths"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-violet-700"
      >
        <ArrowLeft className="h-4 w-4" /> Learning paths
      </Link>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white">
                <Route className="h-5 w-5" />
              </span>
              {path.level && (
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                  {path.level}
                </span>
              )}
              {data.access.isCreator && (
                <LearningStatus value={path.isActive ? "PUBLISHED" : "DRAFT"} />
              )}
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{path.title}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {path.description || "Path details have not been added yet."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Layers3 className="h-3.5 w-3.5" /> {courses.length} courses
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" /> {formatLearningDuration(totalMinutes || null)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> {path._count?.assignments ?? 0} enrolled
              </span>
            </div>
          </div>
          <div className="w-full space-y-2 sm:w-[240px]">
            {myAssignments.length > 0 && (
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                  <span>Your path progress</span>
                  <span className="font-semibold text-gray-900">{progress}%</span>
                </div>
                <LearningProgress
                  value={progress}
                  tone={progress >= 100 ? "emerald" : "violet"}
                  className="mt-2"
                />
                <p className="mt-2 text-[11px] text-gray-500">
                  {completed} of {courses.length} courses complete
                </p>
              </div>
            )}
            {notEnrolled && (
              <button
                onClick={() => void enroll()}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                <PlayCircle className="h-4 w-4" />
                {busy ? "Enrolling…" : "Start this path"}
              </button>
            )}
            {data.access.isCreator && (
              <Link
                href={`/training/creator/paths/${path.id}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4" /> Edit path
              </Link>
            )}
          </div>
        </div>
      </section>

      <LearningPanel
        title="Path curriculum"
        description="Complete the courses in order to finish the path."
        icon={Layers3}
      >
        {courses.length === 0 ? (
          <LearningEmpty
            icon={Compass}
            title="No courses in this path yet"
            description={
              data.access.isCreator
                ? "Add courses in the path builder to complete the journey."
                : "The path is being prepared. Check back soon."
            }
            action={
              data.access.isCreator ? (
                <Link
                  href={`/training/creator/paths/${path.id}`}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Build path
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ol className="space-y-3">
            {courses.map((link, index) => {
              const course = link.course;
              const assignment = myAssignments.find(
                (item) => item.courseId === course.id
              );
              const done = assignment?.status === "COMPLETED";
              const href = assignment
                ? `/training/my-learning/${assignment.id}`
                : `/training/catalog/${course.id}`;
              return (
                <li key={link.id}>
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-4">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        done
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-violet-50 text-violet-700"
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {course.title}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {courseLevelLabel(course.level)} · {courseFormatLabel(course.format)} ·{" "}
                        {formatLearningDuration(course.durationMinutes)}
                      </p>
                      {assignment && assignment.progressPercent > 0 && (
                        <div className="mt-2 max-w-xs">
                          <LearningProgress
                            value={assignment.progressPercent}
                            tone={done ? "emerald" : "violet"}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment && (
                        <LearningStatus value={assignment.status} />
                      )}
                      {data.access.isCreator && (
                        <Link
                          href={`/training/creator/courses/${course.id}`}
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                      )}
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                      >
                        {done ? "Review" : assignment ? "Continue" : "View"}{" "}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </LearningPanel>
    </div>
  );
}
