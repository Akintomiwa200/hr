"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Layers3,
  PlayCircle,
  Route,
  Star,
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
  formatLearningDate,
  formatLearningDuration,
  learningInput,
} from "@/components/training/learning-ui";
import type {
  CourseFeedback,
  LearningAssignment,
  LearningCourseDetail,
} from "@/lib/learning/types";

type AssignmentPayload = {
  assignment: LearningAssignment & {
    course: LearningCourseDetail["course"];
    courseFeedback?: CourseFeedback | null;
  };
};

export function AssignmentWorkspace({ assignmentId }: { assignmentId: string }) {
  const [assignment, setAssignment] = useState<AssignmentPayload["assignment"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetch(`/api/training/assignments/${assignmentId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(
            await readApiError(response, "This assignment could not be loaded.")
          );
        }
        const payload = (await response.json()) as AssignmentPayload;
        setAssignment(payload.assignment);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "This assignment could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    },
    [assignmentId]
  );

  useEffect(() => {
    queueMicrotask(() => void load(true));
  }, [load]);
  useAppEvents({ types: ["training_updated"], onEvent: () => void load(false) });
  useRealtimeStatus((connected) => {
    if (connected) void load(false);
  });

  const progressMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of assignment?.lessonProgress ?? []) {
      map.set(row.lessonId, row.status);
    }
    return map;
  }, [assignment?.lessonProgress]);

  const lessons = useMemo(() => {
    if (!assignment) return [];
    return assignment.course.modules
      .slice()
      .sort((a, b) => a.position - b.position)
      .flatMap((module) =>
        module.lessons
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((lesson) => ({ ...lesson, moduleTitle: module.title }))
      );
  }, [assignment]);

  if (error) return <LearningError message={error} retry={() => void load(true)} />;
  if (!assignment || loading) return <LearningSkeleton rows={4} />;

  const completed = lessons.filter(
    (lesson) => progressMap.get(lesson.id) === "COMPLETED"
  ).length;
  const nextLesson =
    lessons.find((lesson) => progressMap.get(lesson.id) !== "COMPLETED") ?? lessons[0];
  const done = assignment.status === "COMPLETED";
  const base = `/training/my-learning/${assignment.id}/lessons`;

  const markComplete = async () => {
    setBusy(true);
    try {
      await learningAction({
        action: "assignment.update",
        assignmentId: assignment.id,
        status: "COMPLETED",
      });
      notify.success("Assignment marked complete.");
      await load(false);
    } catch (completeError) {
      notify.error(
        completeError instanceof Error
          ? completeError.message
          : "The assignment could not be updated."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <Link
        href="/training/my-learning"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-violet-700"
      >
        <ArrowLeft className="h-4 w-4" /> My learning
      </Link>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <LearningStatus value={assignment.status} />
              {assignment.path && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                  <Route className="h-3.5 w-3.5" /> {assignment.path.title}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">
              {assignment.course.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {assignment.course.description || "Course details have not been added yet."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {formatLearningDuration(assignment.course.durationMinutes)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                Due {formatLearningDate(assignment.dueDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {courseFormatLabel(assignment.course.format)}
              </span>
            </div>
          </div>
          <div className="w-full sm:w-[240px]">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                <span>Progress</span>
                <span className="font-semibold text-gray-900">
                  {assignment.progressPercent}%
                </span>
              </div>
              <LearningProgress
                value={assignment.progressPercent}
                tone={done ? "emerald" : "violet"}
                className="mt-2"
              />
              <p className="mt-2 text-[11px] text-gray-500">
                {completed} of {lessons.length} lessons complete
              </p>
            </div>
            <div className="mt-2 space-y-2">
              {nextLesson && (
                <Link
                  href={`${base}/${nextLesson.id}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  <PlayCircle className="h-4 w-4" />
                  {done ? "Review course" : assignment.progressPercent > 0 ? "Continue" : "Start learning"}
                </Link>
              )}
              {!done && lessons.length > 0 && (
                <button
                  onClick={() => void markComplete()}
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {busy ? "Saving…" : "Mark course complete"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LearningPanel
          title="Your curriculum"
          description="Open any lesson to continue. Progress syncs in real time."
          icon={Layers3}
        >
          {lessons.length === 0 ? (
            <LearningEmpty
              icon={Layers3}
              title="No lessons yet"
              description="The course curriculum is being prepared. Check back soon."
            />
          ) : (
            <ol className="space-y-2">
              {lessons.map((lesson, index) => {
                const status = progressMap.get(lesson.id);
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`${base}/${lesson.id}`}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:border-violet-200 hover:bg-violet-50/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-xs font-bold text-gray-600">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {lesson.title}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {lesson.moduleTitle} · {lesson.type.toLowerCase()}
                          {lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ""}
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
              })}
            </ol>
          )}
        </LearningPanel>

        <div className="space-y-5">
          <LearningPanel title="Assignment details" icon={BookOpen}>
            <dl className="space-y-2.5 text-sm">
              <Row label="Assigned" value={formatLearningDate(assignment.createdAt)} />
              <Row label="Due" value={formatLearningDate(assignment.dueDate)} />
              <Row label="Started" value={formatLearningDate(assignment.startedAt)} />
              <Row label="Completed" value={formatLearningDate(assignment.completedAt)} />
              <Row label="Source" value={assignment.source === "SELF" ? "Self enrolled" : "Assigned"} />
              {assignment.score !== null && <Row label="Score" value={`${assignment.score}%`} />}
            </dl>
            {assignment.notes && (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                {assignment.notes}
              </p>
            )}
            {assignment.feedback && (
              <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                  Manager feedback
                </p>
                <p className="mt-1 text-xs leading-5 text-violet-900">
                  {assignment.feedback}
                </p>
              </div>
            )}
          </LearningPanel>

          {done && (
            <FeedbackPanel
              assignmentId={assignment.id}
              existing={assignment.courseFeedback ?? null}
              onSaved={() => void load(false)}
            />
          )}

          {assignment.course.certificateEnabled && done && (
            <LearningPanel title="Certificate" icon={Award}>
              <p className="text-sm text-gray-600">
                You completed this course. Download or print this page as your record of
                completion.
              </p>
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <Award className="mx-auto h-8 w-8 text-amber-600" />
                <p className="mt-2 text-sm font-semibold text-amber-900">
                  {assignment.course.title}
                </p>
                <p className="text-xs text-amber-700">
                  Completed {formatLearningDate(assignment.completedAt)}
                </p>
              </div>
            </LearningPanel>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackPanel({
  assignmentId,
  existing,
  onSaved,
}: {
  assignmentId: string;
  existing: CourseFeedback | null;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      notify.error("Choose a rating from 1 to 5 stars.");
      return;
    }
    setBusy(true);
    try {
      await learningAction({
        action: "feedback.create",
        assignmentId,
        rating,
        comment,
      });
      notify.success("Thanks for the feedback.");
      onSaved();
    } catch (feedbackError) {
      notify.error(
        feedbackError instanceof Error
          ? feedbackError.message
          : "Your feedback could not be saved."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <LearningPanel
      title="Course feedback"
      description={existing ? "You can update your feedback any time." : "Help us improve this course."}
      icon={Star}
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            className={value <= rating ? "text-amber-400" : "text-gray-300"}
          >
            <Star className="h-6 w-6 fill-current" />
          </button>
        ))}
      </div>
      <textarea
        className={`${learningInput} mt-3 min-h-[80px]`}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="What worked well? What could be better?"
      />
      <button
        onClick={() => void submit()}
        disabled={busy}
        className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {busy ? "Saving…" : existing ? "Update feedback" : "Submit feedback"}
      </button>
    </LearningPanel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
