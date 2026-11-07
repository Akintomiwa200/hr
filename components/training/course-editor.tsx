"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Eye,
  FilePlus2,
  Layers3,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";
import { errorMessage, learningAction } from "@/components/training/learning-actions";
import {
  LearningEmpty,
  LearningError,
  LearningField,
  LearningPanel,
  LearningSkeleton,
  LearningStatus,
  formatLearningDate,
  learningInput,
  learningSelect,
} from "@/components/training/learning-ui";
import type { LearningCourse, LearningCourseDetail } from "@/lib/learning/types";

type CourseForm = {
  title: string;
  code: string;
  description: string;
  objectives: string;
  category: string;
  level: string;
  format: string;
  status: string;
  provider: string;
  url: string;
  thumbnailUrl: string;
  tags: string;
  durationMinutes: string;
  passingScore: string;
  certificateEnabled: boolean;
};

const EMPTY_FORM: CourseForm = {
  title: "",
  code: "",
  description: "",
  objectives: "",
  category: "",
  level: "",
  format: "SELF_PACED",
  status: "DRAFT",
  provider: "",
  url: "",
  thumbnailUrl: "",
  tags: "",
  durationMinutes: "",
  passingScore: "",
  certificateEnabled: false,
};

function formFromCourse(course: LearningCourse): CourseForm {
  return {
    title: course.title,
    code: course.code ?? "",
    description: course.description ?? "",
    objectives: course.objectives ?? "",
    category: course.category ?? "",
    level: course.level ?? "",
    format: course.format || "SELF_PACED",
    status: course.status || "DRAFT",
    provider: course.provider ?? "",
    url: course.url ?? "",
    thumbnailUrl: course.thumbnailUrl ?? "",
    tags: course.tags ?? "",
    durationMinutes: course.durationMinutes ? String(course.durationMinutes) : "",
    passingScore: course.passingScore ? String(course.passingScore) : "",
    certificateEnabled: course.certificateEnabled,
  };
}

export function CourseEditor({ courseId }: { courseId?: string }) {
  const router = useRouter();
  const [course, setCourse] = useState<LearningCourseDetail["course"] | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(Boolean(courseId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [busyModuleId, setBusyModuleId] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = false) => {
      if (!courseId) return;
      if (showLoading) setLoading(true);
      try {
        const response = await fetch(`/api/training/courses/${courseId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "This course could not be loaded."));
        }
        const payload = (await response.json()) as LearningCourseDetail;
        setCourse(payload.course);
        setForm((current) =>
          dirtyRef.current ? current : formFromCourse(payload.course)
        );
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "This course could not be loaded."
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

  const modules = useMemo(() => course?.modules ?? [], [course]);

  const update = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) => {
    dirtyRef.current = true;
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!form.title.trim()) {
      notify.error("Course title is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        code: form.code || null,
        description: form.description || null,
        objectives: form.objectives || null,
        category: form.category || null,
        level: form.level || null,
        format: form.format,
        status: form.status,
        provider: form.provider || null,
        url: form.url || null,
        thumbnailUrl: form.thumbnailUrl || null,
        tags: form.tags || null,
        durationMinutes: form.durationMinutes || null,
        passingScore: form.passingScore || null,
        certificateEnabled: form.certificateEnabled,
      };

      if (!courseId) {
        const created = await learningAction<LearningCourse>({
          action: "course.create",
          ...payload,
        });
        notify.success("Course created. Add modules and lessons next.");
        router.push(`/training/creator/courses/${created.id}`);
        return;
      }

      await learningAction({
        action: "course.update",
        courseId,
        ...payload,
      });
      notify.success("Course saved.");
      dirtyRef.current = false;
      setDirty(false);
      await load(false);
    } catch (saveError) {
      notify.error(errorMessage(saveError, "The course could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: "PUBLISHED" | "DRAFT" | "ARCHIVED") => {
    if (!courseId) {
      update("status", status);
      return;
    }
    setSaving(true);
    try {
      await learningAction({ action: "course.update", courseId, status });
      notify.success(
        status === "PUBLISHED"
          ? "Course published to the catalog."
          : status === "DRAFT"
            ? "Course moved back to draft."
            : "Course archived."
      );
      await load(false);
    } catch (statusError) {
      notify.error(errorMessage(statusError, "The course status could not be changed."));
    } finally {
      setSaving(false);
    }
  };

  const addModule = async () => {
    if (!courseId) return;
    if (!newModuleTitle.trim()) {
      notify.error("Enter a module title.");
      return;
    }
    try {
      await learningAction({
        action: "module.create",
        courseId,
        title: newModuleTitle,
        position: modules.length,
      });
      setNewModuleTitle("");
      notify.success("Module added.");
      await load(false);
    } catch (moduleError) {
      notify.error(errorMessage(moduleError, "The module could not be added."));
    }
  };

  const removeModule = async (moduleId: string, title: string) => {
    if (
      !window.confirm(
        `Delete the module “${title}” and all of its lessons? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyModuleId(moduleId);
    try {
      await learningAction({ action: "module.delete", moduleId });
      notify.success("Module deleted.");
      await load(false);
    } catch (moduleError) {
      notify.error(errorMessage(moduleError, "The module could not be deleted."));
    } finally {
      setBusyModuleId(null);
    }
  };

  if (error) return <LearningError message={error} retry={() => void load(true)} />;
  if (courseId && (loading || !course)) return <LearningSkeleton rows={3} />;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/training/creator/courses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" /> Course manager
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {courseId && (
            <Link
              href={`/training/catalog/${courseId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" /> Preview
            </Link>
          )}
          <button
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : courseId ? "Save changes" : "Create course"}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <BookOpen className="h-5 w-5" />
              </span>
              <LearningStatus value={form.status} />
              {dirty && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                  Unsaved changes
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">
              {courseId ? course?.title ?? "Course editor" : "New course"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {courseId
                ? `Last updated ${formatLearningDate(course?.updatedAt)}`
                : "Set up the course shell, then add modules and lessons."}
            </p>
          </div>
          {courseId && (
            <div className="flex flex-wrap items-center gap-2">
              {form.status !== "PUBLISHED" && (
                <button
                  onClick={() => void setStatus("PUBLISHED")}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" /> Publish
                </button>
              )}
              {form.status === "PUBLISHED" && (
                <button
                  onClick={() => void setStatus("DRAFT")}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Unpublish
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <LearningPanel title="Course details" description="Metadata shown in the catalog and on the course page." icon={Pencil}>
        <div className="grid gap-4 md:grid-cols-2">
          <LearningField label="Course title">
            <input className={learningInput} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Leading High-Performance Teams" />
          </LearningField>
          <LearningField label="Course code">
            <input className={learningInput} value={form.code} onChange={(event) => update("code", event.target.value)} placeholder="e.g. LDR-101" />
          </LearningField>
          <LearningField label="Category">
            <input className={learningInput} value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="e.g. Leadership" />
          </LearningField>
          <LearningField label="Provider">
            <input className={learningInput} value={form.provider} onChange={(event) => update("provider", event.target.value)} placeholder="Internal or external provider" />
          </LearningField>
          <LearningField label="Level">
            <select className={learningSelect} value={form.level} onChange={(event) => update("level", event.target.value)}>
              <option value="">All levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </LearningField>
          <LearningField label="Format">
            <select className={learningSelect} value={form.format} onChange={(event) => update("format", event.target.value)}>
              <option value="SELF_PACED">Self-paced</option>
              <option value="INSTRUCTOR_LED">Instructor-led</option>
              <option value="BLENDED">Blended</option>
              <option value="EXTERNAL">External</option>
            </select>
          </LearningField>
          <LearningField label="Duration (minutes)">
            <input type="number" min="0" className={learningInput} value={form.durationMinutes} onChange={(event) => update("durationMinutes", event.target.value)} placeholder="e.g. 90" />
          </LearningField>
          <LearningField label="Passing score (%)">
            <input type="number" min="0" max="100" className={learningInput} value={form.passingScore} onChange={(event) => update("passingScore", event.target.value)} placeholder="e.g. 80" />
          </LearningField>
          <LearningField label="External URL">
            <input className={learningInput} value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://" />
          </LearningField>
          <LearningField label="Thumbnail URL">
            <input className={learningInput} value={form.thumbnailUrl} onChange={(event) => update("thumbnailUrl", event.target.value)} placeholder="https://" />
          </LearningField>
          <div className="md:col-span-2">
            <LearningField label="Description">
              <textarea className={`${learningInput} min-h-[90px]`} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What the course covers and who it is for." />
            </LearningField>
          </div>
          <div className="md:col-span-2">
            <LearningField label="Learning objectives" hint="One objective per line.">
              <textarea className={`${learningInput} min-h-[100px]`} value={form.objectives} onChange={(event) => update("objectives", event.target.value)} placeholder="Explain the difference between coaching and directing…" />
            </LearningField>
          </div>
          <LearningField label="Tags" hint="Comma separated.">
            <input className={learningInput} value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="leadership, feedback, coaching" />
          </LearningField>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.certificateEnabled} onChange={(event) => update("certificateEnabled", event.target.checked)} />
              Issue a certificate on completion
            </label>
          </div>
          {!courseId && (
            <LearningField label="Initial status">
              <select className={learningSelect} value={form.status} onChange={(event) => update("status", event.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </LearningField>
          )}
        </div>
      </LearningPanel>

      {courseId && (
        <LearningPanel
          title="Curriculum"
          description="Modules group lessons into a clear learning sequence."
          icon={Layers3}
          action={
            <Link
              href={`/training/catalog/${courseId}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline"
            >
              Preview course <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              className={`${learningInput} max-w-xs`}
              value={newModuleTitle}
              onChange={(event) => setNewModuleTitle(event.target.value)}
              placeholder="New module title"
              onKeyDown={(event) => {
                if (event.key === "Enter") void addModule();
              }}
            />
            <button
              onClick={() => void addModule()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" /> Add module
            </button>
          </div>

          {modules.length === 0 ? (
            <LearningEmpty
              icon={FilePlus2}
              title="No modules yet"
              description="Add your first module, then create lessons inside it."
            />
          ) : (
            <div className="space-y-3">
              {modules.map((module, index) => (
                <div key={module.id} className="rounded-xl border border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/70 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-violet-700 ring-1 ring-violet-100">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{module.title}</p>
                        <p className="text-[11px] text-gray-500">
                          {module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}
                          {module.description ? ` · ${module.description}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/training/creator/courses/${courseId}/modules/${module.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit module
                      </Link>
                      <button
                        onClick={() => void removeModule(module.id, module.title)}
                        disabled={busyModuleId === module.id}
                        title="Delete module"
                        className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id} className="flex items-center justify-between gap-2 px-4 py-2">
                        <span className="truncate text-sm text-gray-700">{lesson.title}</span>
                        <span className="shrink-0 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                          {lesson.type.replaceAll("_", " ")}
                        </span>
                      </li>
                    ))}
                    {module.lessons.length === 0 && (
                      <li className="px-4 py-2 text-xs text-gray-500">
                        No lessons yet — open the module to add some.
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </LearningPanel>
      )}

      {!courseId && (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5 text-sm text-violet-900">
          <p className="font-semibold">Next steps after creating the course</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-violet-800">
            <li>Add modules to group the learning.</li>
            <li>Add lessons inside each module (reading, video, quiz or live).</li>
            <li>Publish the course so learners can enroll.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
