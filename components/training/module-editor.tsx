"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  FileText,
  Layers3,
  Pencil,
  Plus,
  Radio,
  Sparkles,
  Target,
  Trash2,
  Video,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";
import { errorMessage, learningAction } from "@/components/training/learning-actions";
import {
  LearningEmpty,
  LearningError,
  LearningField,
  LearningPanel,
  LearningSkeleton,
  learningInput,
  learningSelect,
} from "@/components/training/learning-ui";
import type {
  LearningCourseDetail,
  LearningLesson,
  LearningModule,
} from "@/lib/learning/types";
import { cn } from "@/lib/utils";

const LESSON_TYPES = [
  { value: "READING", label: "Reading", icon: FileText },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "QUIZ", label: "Quiz", icon: Target },
  { value: "ASSIGNMENT", label: "Practice assignment", icon: Sparkles },
  { value: "LIVE", label: "Live session", icon: Radio },
] as const;

type LessonForm = {
  title: string;
  type: string;
  description: string;
  content: string;
  url: string;
  durationMinutes: string;
  isPreview: boolean;
  quiz: string;
};

const EMPTY_LESSON: LessonForm = {
  title: "",
  type: "READING",
  description: "",
  content: "",
  url: "",
  durationMinutes: "",
  isPreview: false,
  quiz: "",
};

function formFromLesson(lesson: LearningLesson): LessonForm {
  return {
    title: lesson.title,
    type: lesson.type,
    description: lesson.description ?? "",
    content: lesson.content ?? "",
    url: lesson.url ?? "",
    durationMinutes: lesson.durationMinutes ? String(lesson.durationMinutes) : "",
    isPreview: lesson.isPreview,
    quiz: lesson.quiz ? JSON.stringify(lesson.quiz, null, 2) : "",
  };
}

export function ModuleEditor({
  courseId,
  moduleId,
}: {
  courseId: string;
  moduleId: string;
}) {
  const router = useRouter();
  const [course, setCourse] = useState<LearningCourseDetail["course"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LearningLesson | null>(null);
  const [busyLessonId, setBusyLessonId] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetch(`/api/training/courses/${courseId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "This module could not be loaded."));
        }
        const payload = (await response.json()) as LearningCourseDetail;
        setCourse(payload.course);
        const activeModule = payload.course.modules.find((item) => item.id === moduleId);
        if (activeModule) {
          setTitle((current) => current || activeModule.title);
          setDescription((current) => current || (activeModule.description ?? ""));
        }
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "This module could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    },
    [courseId, moduleId]
  );

  useEffect(() => {
    queueMicrotask(() => void load(true));
  }, [load]);
  useAppEvents({ types: ["training_updated"], onEvent: () => void load(false) });
  useRealtimeStatus((connected) => {
    if (connected) void load(false);
  });

  const activeModule: LearningModule | undefined = useMemo(
    () => course?.modules.find((item) => item.id === moduleId),
    [course, moduleId]
  );
  const lessons = useMemo(
    () => (activeModule?.lessons ?? []).slice().sort((a, b) => a.position - b.position),
    [activeModule]
  );

  const saveModule = async () => {
    if (!title.trim()) {
      notify.error("Module title is required.");
      return;
    }
    setSaving(true);
    try {
      await learningAction({
        action: "module.update",
        moduleId,
        title,
        description: description || null,
      });
      notify.success("Module saved.");
      await load(false);
    } catch (saveError) {
      notify.error(errorMessage(saveError, "The module could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const removeModule = async () => {
    if (!window.confirm("Delete this module and all of its lessons? This cannot be undone.")) {
      return;
    }
    setSaving(true);
    try {
      await learningAction({ action: "module.delete", moduleId });
      notify.success("Module deleted.");
      router.push(`/training/creator/courses/${courseId}`);
    } catch (deleteError) {
      notify.error(errorMessage(deleteError, "The module could not be deleted."));
      setSaving(false);
    }
  };

  const deleteLesson = async (lesson: LearningLesson) => {
    if (!window.confirm(`Delete the lesson “${lesson.title}”?`)) return;
    setBusyLessonId(lesson.id);
    try {
      await learningAction({ action: "lesson.delete", lessonId: lesson.id });
      notify.success("Lesson deleted.");
      await load(false);
    } catch (deleteError) {
      notify.error(errorMessage(deleteError, "The lesson could not be deleted."));
    } finally {
      setBusyLessonId(null);
    }
  };

  const moveLesson = async (index: number, direction: -1 | 1) => {
    const target = lessons[index + direction];
    const current = lessons[index];
    if (!current || !target) return;
    setBusyLessonId(current.id);
    try {
      await Promise.all([
        learningAction({
          action: "lesson.update",
          lessonId: current.id,
          position: target.position,
        }),
        learningAction({
          action: "lesson.update",
          lessonId: target.id,
          position: current.position,
        }),
      ]);
      await load(false);
    } catch (moveError) {
      notify.error(errorMessage(moveError, "Lessons could not be reordered."));
    } finally {
      setBusyLessonId(null);
    }
  };

  if (error) return <LearningError message={error} retry={() => void load(true)} />;
  if (loading || !course) return <LearningSkeleton rows={3} />;
  if (!activeModule) {
    return (
      <LearningError
        message="That module is no longer part of this course."
        retry={() => router.push(`/training/creator/courses/${courseId}`)}
      />
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/training/creator/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" /> {course.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void removeModule()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Delete module
          </button>
          <button
            onClick={() => void saveModule()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save module"}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Layers3 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{activeModule.title}</h1>
            <p className="text-xs text-gray-500">
              Module {course.modules.findIndex((item) => item.id === activeModule.id) + 1} ·{" "}
              {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <LearningField label="Module title">
            <input className={learningInput} value={title} onChange={(event) => setTitle(event.target.value)} />
          </LearningField>
          <LearningField label="Description">
            <input className={learningInput} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this module covers" />
          </LearningField>
        </div>
      </section>

      <LearningPanel
        title="Lessons"
        description="Build the lesson sequence inside this module."
        icon={FileText}
        action={
          <button
            onClick={() => {
              setEditingLesson(null);
              setLessonOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" /> Add lesson
          </button>
        }
      >
        {lessons.length === 0 ? (
          <LearningEmpty
            icon={FileText}
            title="No lessons yet"
            description="Add a reading, video, quiz, practice assignment or live session."
            action={
              <button
                onClick={() => {
                  setEditingLesson(null);
                  setLessonOpen(true);
                }}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Add the first lesson
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson, index) => {
              const type = LESSON_TYPES.find((item) => item.value === lesson.type);
              const Icon = type?.icon ?? FileText;
              return (
                <div
                  key={lesson.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 px-4 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {index + 1}. {lesson.title}
                      </p>
                      {lesson.isPreview && (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                          Preview
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {type?.label ?? lesson.type}
                      {lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ""}
                      {lesson.description ? ` · ${lesson.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => void moveLesson(index, -1)}
                      disabled={index === 0 || busyLessonId === lesson.id}
                      title="Move up"
                      className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void moveLesson(index, 1)}
                      disabled={index === lessons.length - 1 || busyLessonId === lesson.id}
                      title="Move down"
                      className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingLesson(lesson);
                        setLessonOpen(true);
                      }}
                      title="Edit lesson"
                      className="rounded-md border border-violet-200 bg-violet-50 p-1.5 text-violet-700 hover:bg-violet-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void deleteLesson(lesson)}
                      disabled={busyLessonId === lesson.id}
                      title="Delete lesson"
                      className="rounded-md border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </LearningPanel>

      {lessonOpen && (
        <LessonDialog
          key={editingLesson?.id ?? "new-lesson"}
          onClose={() => setLessonOpen(false)}
          moduleId={moduleId}
          lesson={editingLesson}
          position={lessons.length}
          onSaved={() => {
            setLessonOpen(false);
            setEditingLesson(null);
            void load(false);
          }}
        />
      )}
    </div>
  );
}

function LessonDialog({
  onClose,
  moduleId,
  lesson,
  position,
  onSaved,
}: {
  onClose: () => void;
  moduleId: string;
  lesson: LearningLesson | null;
  position: number;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<LessonForm>(() =>
    lesson ? formFromLesson(lesson) : EMPTY_LESSON
  );
  const [busy, setBusy] = useState(false);

  const update = <K extends keyof LessonForm>(key: K, value: LessonForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.title.trim()) {
      notify.error("Lesson title is required.");
      return;
    }
    let quiz: unknown = null;
    if (form.type === "QUIZ" && form.quiz.trim()) {
      try {
        quiz = JSON.parse(form.quiz);
      } catch {
        notify.error("Quiz JSON is not valid. Check the format and try again.");
        return;
      }
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        type: form.type,
        description: form.description || null,
        content: form.content || null,
        url: form.url || null,
        durationMinutes: form.durationMinutes || null,
        isPreview: form.isPreview,
        quiz,
      };
      if (lesson) {
        await learningAction({
          action: "lesson.update",
          lessonId: lesson.id,
          ...payload,
        });
        notify.success("Lesson saved.");
      } else {
        await learningAction({
          action: "lesson.create",
          moduleId,
          position,
          ...payload,
        });
        notify.success("Lesson added.");
      }
      onSaved();
    } catch (saveError) {
      notify.error(errorMessage(saveError, "The lesson could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={lesson ? "Edit lesson" : "Add lesson"}
      description="Reading, video, quiz, practice or live session."
      size="lg"
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <LearningField label="Lesson title">
            <input className={learningInput} value={form.title} onChange={(event) => update("title", event.target.value)} />
          </LearningField>
          <LearningField label="Type">
            <select className={learningSelect} value={form.type} onChange={(event) => update("type", event.target.value)}>
              {LESSON_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </LearningField>
        </div>
        <LearningField label="Short description">
          <input className={learningInput} value={form.description} onChange={(event) => update("description", event.target.value)} />
        </LearningField>
        <LearningField label={form.type === "QUIZ" ? "Instructions" : "Content"}>
          <textarea
            className={`${learningInput} min-h-[120px]`}
            value={form.content}
            onChange={(event) => update("content", event.target.value)}
            placeholder={
              form.type === "VIDEO"
                ? "Context for the video (optional)."
                : form.type === "QUIZ"
                  ? "Instructions shown above the quiz questions."
                  : "Write the lesson content. Separate paragraphs with a blank line."
            }
          />
        </LearningField>
        <div className="grid gap-3 sm:grid-cols-2">
          <LearningField label={form.type === "VIDEO" ? "Video URL" : form.type === "LIVE" ? "Meeting URL" : "Resource URL"}>
            <input className={learningInput} value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://" />
          </LearningField>
          <LearningField label="Duration (minutes)">
            <input type="number" min="0" className={learningInput} value={form.durationMinutes} onChange={(event) => update("durationMinutes", event.target.value)} />
          </LearningField>
        </div>
        {form.type === "QUIZ" && (
          <LearningField
            label="Quiz questions (JSON)"
            hint='Format: {"questions":[{"question":"…","options":["A","B"],"answer":0}]}'
          >
            <textarea
              className={`${learningInput} min-h-[140px] font-mono text-xs`}
              value={form.quiz}
              onChange={(event) => update("quiz", event.target.value)}
              placeholder={'{\n  "questions": [\n    { "question": "…", "options": ["A", "B"], "answer": 0 }\n  ]\n}'}
            />
          </LearningField>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isPreview} onChange={(event) => update("isPreview", event.target.checked)} />
          Allow this lesson to be previewed before enrolling
        </label>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy}
            className={cn(
              "rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            )}
          >
            {busy ? "Saving…" : lesson ? "Save lesson" : "Add lesson"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
