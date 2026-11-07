"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Layers3,
  Pencil,
  PlayCircle,
  Radio,
  Sparkles,
  Target,
  Users,
  Video,
} from "lucide-react";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";
import { learningAction } from "@/components/training/learning-actions";
import {
  LearningEmpty,
  LearningError,
  LearningPanel,
  LearningProgress,
  LearningSkeleton,
  LearningStatus,
  courseFormatLabel,
  courseLevelLabel,
  formatLearningDate,
  formatLearningDuration,
} from "@/components/training/learning-ui";
import type {
  LearningAssignment,
  LearningCourseDetail,
  LearningLesson,
} from "@/lib/learning/types";

const LESSON_ICONS = {
  READING: FileText,
  VIDEO: Video,
  QUIZ: Target,
  ASSIGNMENT: Sparkles,
  LIVE: Radio,
} as const;

export function CourseDetail({ courseId }: { courseId: string }) {
  const [data, setData] = useState<LearningCourseDetail | null>(null);
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetch(`/api/training/courses/${courseId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(
            await readApiError(response, "This course could not be loaded.")
          );
        }
        setData((await response.json()) as LearningCourseDetail);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "This course could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    },
    [courseId]
  );

  useEffect(() => {
    queueMicrotask(() => void load(true));
  }, [load]);
  useAppEvents({ types: ["training_updated"], onEvent: () => void load(false) });
  useRealtimeStatus((connected) => {
    if (connected) void load(false);
  });

  const progressByLesson = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of data?.assignment?.lessonProgress ?? []) {
      map.set(row.lessonId, row.status);
    }
    return map;
  }, [data?.assignment]);

  const enroll = async () => {
    setBusy(true);
    try {
      await learningAction({ action: "enroll", courseId });
      notify.success("You are enrolled. Start the first lesson now.");
      await load(false);
    } catch (enrollError) {
      notify.error(
        enrollError instanceof Error
          ? enrollError.message
          : "You could not be enrolled."
      );
    } finally {
      setBusy(false);
    }
  };

  if (error) return <LearningError message={error} retry={() => void load(true)} />;
  if (!data) return <LearningSkeleton rows={4} />;

  const { course, assignment, access, feedback } = data;
  const lessons = course.modules.flatMap((module) => module.lessons);
  const completed = lessons.filter(
    (lesson) => progressByLesson.get(lesson.id) === "COMPLETED"
  ).length;
  const firstIncomplete =
    lessons.find((lesson) => progressByLesson.get(lesson.id) !== "COMPLETED") ??
    lessons[0];
  const playerBase = assignment
    ? `/training/my-learning/${assignment.id}/lessons`
    : `/training/catalog/${course.id}/lessons`;
  const feedbackAverage =
    feedback.length > 0
      ? Math.round(
          (feedback.reduce((total, item) => total + item.rating, 0) /
            feedback.length) *
            10
        ) / 10
      : null;

  return (
    <div className="space-y-5 pb-10">
      <Link
        href={access.isCreator ? "/training/creator/courses" : "/training/catalog"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-violet-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {access.isCreator ? "Back to course manager" : "Back to catalog"}
      </Link>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gradient-to-r from-violet-50 via-white to-white px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white">
                  <BookOpen className="h-5 w-5" />
                </span>
                {access.isCreator && <LearningStatus value={course.status} />}
                {course.category && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                    {course.category}
                  </span>
                )}
                {course.code && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                    {course.code}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
                {course.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                {course.description || "Course details have not been added yet."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatLearningDuration(course.durationMinutes)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers3 className="h-3.5 w-3.5" />
                  {course.modules.length} modules · {lessons.length} lessons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {course._count?.assignments ?? 0} learners
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  {courseLevelLabel(course.level)} · {courseFormatLabel(course.format)}
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
              {assignment ? (
                <>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                      <span>Your progress</span>
                      <span className="font-semibold text-gray-900">
                        {assignment.progressPercent}%
                      </span>
                    </div>
                    <LearningProgress
                      value={assignment.progressPercent}
                      tone={assignment.progressPercent >= 100 ? "emerald" : "violet"}
                      className="mt-2"
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      {completed} of {lessons.length} lessons complete
                    </p>
                  </div>
                  {firstIncomplete && (
                    <Link
                      href={`${playerBase}/${firstIncomplete.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      <PlayCircle className="h-4 w-4" />
                      {assignment.status === "COMPLETED"
                        ? "Review course"
                        : assignment.progressPercent > 0
                          ? "Continue learning"
                          : "Start learning"}
                    </Link>
                  )}
                </>
              ) : course.status === "PUBLISHED" && course.isActive ? (
                <button
                  onClick={() => void enroll()}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  <PlayCircle className="h-4 w-4" />
                  {busy ? "Enrolling…" : "Enroll in this course"}
                </button>
              ) : null}
              {access.isCreator && (
                <Link
                  href={`/training/creator/courses/${course.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" /> Edit course
                </Link>
              )}
            </div>
          </div>
        </div>

        {(course.objectives || course.tags) && (
          <div className="grid gap-4 px-5 py-5 sm:px-7 md:grid-cols-2">
            {course.objectives && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  What you will learn
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                  {course.objectives}
                </p>
              </div>
            )}
            {course.tags && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Skills & tags
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {course.tags.split(",").map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LearningPanel
          title="Course curriculum"
          description="Work through each module and lesson at your own pace."
          icon={Layers3}
        >
          {course.modules.length === 0 ? (
            <LearningEmpty
              icon={Layers3}
              title="No curriculum yet"
              description={
                access.isCreator
                  ? "Add modules and lessons in the creator studio to build this course."
                  : "The course content is being prepared. Check back soon."
              }
              action={
                access.isCreator ? (
                  <Link
                    href={`/training/creator/courses/${course.id}`}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    Build curriculum
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {course.modules.map((module, moduleIndex) => {
                const moduleCompleted = module.lessons.filter(
                  (lesson) => progressByLesson.get(lesson.id) === "COMPLETED"
                ).length;
                return (
                  <div
                    key={module.id}
                    className="overflow-hidden rounded-xl border border-gray-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/70 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">
                          {moduleIndex + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {module.title}
                          </p>
                          {module.description && (
                            <p className="text-xs text-gray-500">{module.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-gray-500">
                        {moduleCompleted}/{module.lessons.length} complete
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {module.lessons.map((lesson) => {
                        const status = progressByLesson.get(lesson.id);
                        return (
                          <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            status={status}
                            href={`${playerBase}/${lesson.id}`}
                          />
                        );
                      })}
                      {module.lessons.length === 0 && (
                        <li className="px-4 py-3 text-xs text-gray-500">
                          No lessons in this module yet.
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </LearningPanel>

        <div className="space-y-5">
          <LearningPanel title="Course details" icon={BookOpen}>
            <dl className="space-y-2.5 text-sm">
              <DetailRow label="Provider" value={course.provider || "Company learning"} />
              <DetailRow label="Format" value={courseFormatLabel(course.format)} />
              <DetailRow label="Level" value={courseLevelLabel(course.level)} />
              <DetailRow label="Duration" value={formatLearningDuration(course.durationMinutes)} />
              <DetailRow label="Passing score" value={course.passingScore ? `${course.passingScore}%` : "—"} />
              <DetailRow label="Certificate" value={course.certificateEnabled ? "Available" : "Not required"} />
              {course.url && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                  <dt className="text-gray-500">External link</dt>
                  <dd>
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-violet-700 hover:underline"
                    >
                      Open
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </LearningPanel>

          <LearningPanel
            title="Learner feedback"
            description={
              feedbackAverage
                ? `${feedbackAverage} / 5 from ${feedback.length} review${feedback.length === 1 ? "" : "s"}`
                : "No feedback yet."
            }
            icon={Award}
          >
            {feedback.length === 0 ? (
              <p className="text-sm text-gray-500">
                Feedback appears here once learners complete the course.
              </p>
            ) : (
              <div className="space-y-3">
                {feedback.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-900">
                        {item.employee.firstName} {item.employee.lastName}
                      </span>
                      <span className="text-amber-500">{"★".repeat(item.rating)}</span>
                    </div>
                    {item.comment && (
                      <p className="mt-1 text-xs leading-5 text-gray-600">{item.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </LearningPanel>

          {access.isManager && data.assignments.length > 0 && (
            <LearningPanel
              title="Assigned learners"
              description={`${data.assignments.length} assignment${data.assignments.length === 1 ? "" : "s"} for this course.`}
              icon={Users}
              action={
                <Link
                  href="/training/assignments"
                  className="text-xs font-semibold text-violet-700 hover:underline"
                >
                  Manage
                </Link>
              }
            >
              <div className="space-y-2">
                {data.assignments.slice(0, 6).map((item: LearningAssignment) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-900">
                        {item.employee.firstName} {item.employee.lastName}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Due {formatLearningDate(item.dueDate)}
                      </p>
                    </div>
                    <LearningStatus value={item.status} />
                  </div>
                ))}
              </div>
            </LearningPanel>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  status,
  href,
}: {
  lesson: LearningLesson;
  status?: string;
  href: string;
}) {
  const Icon = LESSON_ICONS[lesson.type as keyof typeof LESSON_ICONS] ?? FileText;
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3 transition hover:bg-violet-50/40"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{lesson.title}</p>
          <p className="text-[11px] text-gray-500">
            {lesson.type.replaceAll("_", " ").toLowerCase()}
            {lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ""}
            {lesson.isPreview ? " · Preview" : ""}
          </p>
        </div>
        {status === "COMPLETED" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : status === "IN_PROGRESS" ? (
          <Clock3 className="h-4 w-4 text-amber-500" />
        ) : (
          <ArrowRight className="h-4 w-4 text-gray-300" />
        )}
      </Link>
    </li>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
