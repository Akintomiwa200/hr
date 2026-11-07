"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Radio,
  Sparkles,
  Target,
  Video,
} from "lucide-react";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";
import { learningAction } from "@/components/training/learning-actions";
import {
  LearningError,
  LearningProgress,
  LearningSkeleton,
  LearningStatus,
  formatLearningDuration,
} from "@/components/training/learning-ui";
import type {
  LearningAssignment,
  LearningCourseDetail,
  LearningLesson,
} from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type AssignmentResponse = {
  assignment: LearningAssignment & {
    course: LearningCourseDetail["course"];
  };
};

const TYPE_LABELS: Record<string, string> = {
  READING: "Reading",
  VIDEO: "Video",
  QUIZ: "Quiz",
  ASSIGNMENT: "Practice",
  LIVE: "Live session",
};

const TYPE_ICONS = {
  READING: FileText,
  VIDEO: Video,
  QUIZ: Target,
  ASSIGNMENT: Sparkles,
  LIVE: Radio,
} as const;

export function LessonPlayer({
  courseId,
  lessonId,
  assignmentId,
}: {
  courseId?: string;
  lessonId: string;
  assignmentId?: string;
}) {
  const router = useRouter();
  const [courseData, setCourseData] = useState<LearningCourseDetail | null>(null);
  const [assignmentData, setAssignmentData] =
    useState<LearningAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedRef = useRef<string | null>(null);

  const load = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        if (assignmentId) {
          const response = await fetch(
            `/api/training/assignments/${assignmentId}`,
            { cache: "no-store" }
          );
          if (!response.ok) {
            throw new Error(
              await readApiError(response, "This lesson could not be loaded.")
            );
          }
          const payload = (await response.json()) as AssignmentResponse;
          setAssignmentData(payload.assignment);
          setCourseData({
            course: payload.assignment.course,
            assignment: payload.assignment,
            assignments: [],
            feedback: [],
            access: {
              companyId: null,
              employeeId: payload.assignment.employeeId,
              role: "",
              isCreator: false,
              isManager: false,
              isSelfService: true,
            },
          });
          setError(null);
          return;
        }

        if (!courseId) throw new Error("This lesson could not be loaded.");
        const courseResponse = await fetch(`/api/training/courses/${courseId}`, {
          cache: "no-store",
        });
        if (!courseResponse.ok) {
          throw new Error(
            await readApiError(courseResponse, "This lesson could not be loaded.")
          );
        }
        const course = (await courseResponse.json()) as LearningCourseDetail;
        setCourseData(course);
        setAssignmentData(course.assignment);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "This lesson could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    },
    [courseId, assignmentId]
  );

  useEffect(() => {
    queueMicrotask(() => void load(true));
  }, [load]);
  useAppEvents({ types: ["training_updated"], onEvent: () => void load(false) });
  useRealtimeStatus((connected) => {
    if (connected) void load(false);
  });

  const lessons = useMemo(
    () =>
      (courseData?.course.modules ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .flatMap((module) =>
          module.lessons
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((lesson) => ({ ...lesson, moduleId: module.id, moduleTitle: module.title }))
        ),
    [courseData?.course.modules]
  );

  const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  const lesson = lessons[currentIndex];
  const nextLesson = lessons[currentIndex + 1];
  const progressMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of assignmentData?.lessonProgress ?? []) {
      map.set(row.lessonId, row.status);
    }
    return map;
  }, [assignmentData]);
  const lessonStatus = progressMap.get(lessonId);

  // Opening a lesson marks it as started so managers see live activity.
  useEffect(() => {
    if (!assignmentData || !lesson) return;
    if (lessonStatus) return;
    const key = `${assignmentData.id}:${lesson.id}`;
    if (startedRef.current === key) return;
    startedRef.current = key;
    void learningAction({
      action: "lesson.progress",
      assignmentId: assignmentData.id,
      lessonId: lesson.id,
      status: "IN_PROGRESS",
    }).catch(() => undefined);
  }, [assignmentData, lesson, lessonStatus]);

  const completeLesson = async () => {
    if (!assignmentData || !lesson) return;
    setBusy(true);
    try {
      await learningAction({
        action: "lesson.progress",
        assignmentId: assignmentData.id,
        lessonId: lesson.id,
        status: "COMPLETED",
      });
      notify.success("Lesson complete.");
      await load(false);
      if (nextLesson) {
        router.push(
          `/training/my-learning/${assignmentData.id}/lessons/${nextLesson.id}`
        );
      }
    } catch (completeError) {
      notify.error(
        completeError instanceof Error
          ? completeError.message
          : "Your progress could not be saved."
      );
    } finally {
      setBusy(false);
    }
  };

  if (error) return <LearningError message={error} retry={() => void load(true)} />;
  if (!courseData || loading) return <LearningSkeleton rows={3} />;
  if (!lesson) {
    return (
      <LearningError
        message="That lesson is no longer part of this course."
        retry={() => void load(true)}
      />
    );
  }

  const Icon = TYPE_ICONS[lesson.type as keyof typeof TYPE_ICONS] ?? FileText;
  const playerBase = assignmentData
    ? `/training/my-learning/${assignmentData.id}/lessons`
    : `/training/catalog/${courseData.course.id}/lessons`;
  const backHref = assignmentData
    ? `/training/my-learning/${assignmentData.id}`
    : `/training/catalog/${courseData.course.id}`;
  const isEnrolled = Boolean(assignmentData);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" /> {courseData.course.title}
        </Link>
        {assignmentData && (
          <div className="flex min-w-[220px] items-center gap-3">
            <LearningProgress
              value={assignmentData.progressPercent}
              tone={assignmentData.progressPercent >= 100 ? "emerald" : "violet"}
            />
            <span className="text-xs font-semibold text-gray-600">
              {assignmentData.progressPercent}%
            </span>
            <LearningStatus value={assignmentData.status} />
          </div>
        )}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
              <Icon className="h-3.5 w-3.5" />
              {TYPE_LABELS[lesson.type] ?? lesson.type}
            </span>
            {lesson.durationMinutes ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500">
                <Clock3 className="h-3.5 w-3.5" />
                {formatLearningDuration(lesson.durationMinutes)}
              </span>
            ) : null}
            {lessonStatus === "COMPLETED" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed
              </span>
            )}
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">
            {lesson.moduleTitle}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{lesson.title}</h1>
          {lesson.description && (
            <p className="mt-2 text-sm leading-6 text-gray-600">{lesson.description}</p>
          )}

          <div className="mt-6">
            <LessonBody lesson={lesson} />
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" /> Course overview
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {isEnrolled ? (
                <button
                  onClick={() => void completeLesson()}
                  disabled={busy}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60",
                    lessonStatus === "COMPLETED"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-violet-600 hover:bg-violet-700"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {busy
                    ? "Saving…"
                    : lessonStatus === "COMPLETED"
                      ? "Marked complete"
                      : "Mark lesson complete"}
                </button>
              ) : (
                <Link
                  href={`/training/catalog/${courseData.course.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Enroll to track progress
                </Link>
              )}
              {nextLesson && (
                <Link
                  href={`${playerBase}/${nextLesson.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Course contents
          </h2>
          <div className="mt-3 space-y-3">
            {courseData.course.modules.map((module) => (
              <div key={module.id}>
                <p className="px-1 text-[11px] font-semibold text-gray-700">
                  {module.title}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {module.lessons.map((item) => {
                    const active = item.id === lessonId;
                    const status = progressMap.get(item.id);
                    return (
                      <li key={item.id}>
                        <Link
                          href={`${playerBase}/${item.id}`}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition",
                            active
                              ? "bg-violet-50 font-semibold text-violet-700"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {status === "COMPLETED" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                active ? "bg-violet-500" : "bg-gray-300"
                              )}
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function LessonBody({ lesson }: { lesson: LearningLesson }) {
  if (lesson.type === "VIDEO") {
    const embed = toEmbedUrl(lesson.url);
    if (embed) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-black">
          <iframe
            src={embed}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
    }
  }

  if (lesson.type === "QUIZ" && isQuiz(lesson.quiz)) {
    return <QuizBlock lesson={lesson} quiz={lesson.quiz} />;
  }

  return (
    <div className="space-y-4">
      {lesson.content ? (
        <div className="space-y-3 text-sm leading-7 text-gray-700">
          {lesson.content.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          The author has not added content for this lesson yet.
        </p>
      )}
      {lesson.url && (
        <a
          href={lesson.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
        >
          <ExternalLink className="h-4 w-4" />
          {lesson.type === "LIVE" ? "Join session" : "Open resource"}
        </a>
      )}
    </div>
  );
}

type QuizQuestion = { question: string; options: string[]; answer?: number };

function isQuiz(value: unknown): value is { questions: QuizQuestion[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { questions?: unknown }).questions)
  );
}

function QuizBlock({
  lesson,
  quiz,
}: {
  lesson: LearningLesson;
  quiz: { questions: QuizQuestion[] };
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const correct = quiz.questions.filter(
    (question, index) =>
      typeof question.answer === "number" && answers[index] === question.answer
  ).length;
  const score =
    quiz.questions.length > 0
      ? Math.round((correct / quiz.questions.length) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {lesson.content && (
        <p className="text-sm leading-6 text-gray-600">{lesson.content}</p>
      )}
      {quiz.questions.map((question, index) => (
        <fieldset
          key={index}
          className="rounded-xl border border-gray-200 p-4"
          disabled={submitted}
        >
          <legend className="px-1 text-sm font-semibold text-gray-900">
            {index + 1}. {question.question}
          </legend>
          <div className="mt-2 space-y-1.5">
            {question.options.map((option, optionIndex) => {
              const chosen = answers[index] === optionIndex;
              const isAnswer =
                submitted && typeof question.answer === "number" && question.answer === optionIndex;
              return (
                <label
                  key={optionIndex}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    isAnswer
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : chosen
                        ? "border-violet-300 bg-violet-50 text-violet-800"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <input
                    type="radio"
                    name={`quiz-${lesson.id}-${index}`}
                    checked={chosen}
                    onChange={() =>
                      setAnswers((current) => ({ ...current, [index]: optionIndex }))
                    }
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={Object.keys(answers).length !== quiz.questions.length}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Submit answers
          </button>
        ) : (
          <p className="text-sm font-semibold text-gray-900">
            Score: <span className="text-violet-700">{score}%</span> ({correct}/
            {quiz.questions.length} correct)
          </p>
        )}
        {submitted && (
          <button
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

function toEmbedUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
    }
    if (parsed.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      return `https://player.vimeo.com/video/${parsed.pathname.split("/").filter(Boolean)[0]}`;
    }
    return url;
  } catch {
    return null;
  }
}
