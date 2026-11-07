"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Compass,
  Eye,
  Layers3,
  Plus,
  Route,
  Save,
  Trash2,
} from "lucide-react";
import { useLearningWorkspace } from "@/components/training/use-learning-workspace";
import {
  LearningEmpty,
  LearningError,
  LearningField,
  LearningPanel,
  LearningSkeleton,
  LearningStatus,
  formatLearningDuration,
  learningInput,
  learningSelect,
} from "@/components/training/learning-ui";
import { errorMessage, learningAction } from "@/components/training/learning-actions";
import { notify } from "@/lib/toast";
import type { LearningCourse, LearningPath } from "@/lib/learning/types";

export function PathEditor({ pathId }: { pathId: string }) {
  const { data, loading, error, reload } = useLearningWorkspace();

  const path = useMemo(
    () => data?.paths.find((item) => item.id === pathId),
    [data?.paths, pathId]
  );

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data || loading) return <LearningSkeleton rows={4} />;

  if (!path) {
    return (
      <LearningEmpty
        icon={Compass}
        title="Learning path not found"
        description="This path may have been removed or belongs to another company."
        action={
          <Link
            href="/training/creator/paths"
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Back to path builder
          </Link>
        }
      />
    );
  }

  return (
    <PathEditorForm
      key={path.id}
      path={path}
      allCourses={data.courses}
      onReload={() => reload(false)}
    />
  );
}

function PathEditorForm({
  path,
  allCourses,
  onReload,
}: {
  path: LearningPath;
  allCourses: LearningCourse[];
  onReload: () => Promise<void>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(path.title);
  const [description, setDescription] = useState(path.description ?? "");
  const [level, setLevel] = useState(path.level ?? "");
  const [isActive, setIsActive] = useState(path.isActive);
  const [saving, setSaving] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState("");

  const courses = useMemo(
    () => (path.courses ?? []).slice().sort((a, b) => a.position - b.position),
    [path.courses]
  );

  const availableCourses = useMemo(
    () =>
      allCourses.filter(
        (course) => !courses.some((link) => link.courseId === course.id)
      ),
    [allCourses, courses]
  );

  const save = async () => {
    if (!title.trim()) {
      notify.error("Path title is required.");
      return;
    }
    setSaving(true);
    try {
      await learningAction({
        action: "path.update",
        pathId: path.id,
        title,
        description: description || null,
        level: level || null,
        isActive,
      });
      notify.success("Learning path saved.");
      await onReload();
    } catch (saveError) {
      notify.error(errorMessage(saveError, "The path could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const addCourse = async () => {
    if (!selectedCourse) {
      notify.error("Choose a course to add.");
      return;
    }
    setSaving(true);
    try {
      await learningAction({
        action: "path.course.add",
        pathId: path.id,
        courseId: selectedCourse,
        position: courses.length,
      });
      setSelectedCourse("");
      notify.success("Course added to the path.");
      await onReload();
    } catch (addError) {
      notify.error(errorMessage(addError, "The course could not be added."));
    } finally {
      setSaving(false);
    }
  };

  const removeCourse = async (linkId: string, courseTitle: string) => {
    if (!window.confirm(`Remove “${courseTitle}” from this path?`)) return;
    setBusyLinkId(linkId);
    try {
      await learningAction({ action: "path.course.remove", pathId: path.id, linkId });
      notify.success("Course removed from the path.");
      await onReload();
    } catch (removeError) {
      notify.error(errorMessage(removeError, "The course could not be removed."));
    } finally {
      setBusyLinkId(null);
    }
  };

  const moveCourse = async (linkId: string, direction: "up" | "down") => {
    setBusyLinkId(linkId);
    try {
      await learningAction({
        action: "path.course.move",
        pathId: path.id,
        linkId,
        direction,
      });
      await onReload();
    } catch (moveError) {
      notify.error(errorMessage(moveError, "The course could not be moved."));
    } finally {
      setBusyLinkId(null);
    }
  };

  const removePath = async () => {
    if (
      !window.confirm(
        `Delete the learning path “${title}”? Assignments that reference it will keep their courses.`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await learningAction({ action: "path.delete", pathId: path.id });
      notify.success("Learning path deleted.");
      router.push("/training/creator/paths");
    } catch (deleteError) {
      notify.error(errorMessage(deleteError, "The path could not be deleted."));
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/training/creator/paths"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" /> Path builder
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/training/paths/${path.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" /> Preview
          </Link>
          <button
            onClick={() => void removePath()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Delete path
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save path"}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Route className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{path.title}</h1>
              <LearningStatus value={isActive ? "PUBLISHED" : "DRAFT"} />
            </div>
            <p className="text-xs text-gray-500">
              {courses.length} course{courses.length === 1 ? "" : "s"} ·{" "}
              {path._count?.assignments ?? 0} enrolled
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <LearningField label="Path title">
            <input
              className={learningInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. New Manager Foundations"
            />
          </LearningField>
          <LearningField label="Level">
            <select
              className={learningSelect}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="">All levels</option>
              <option value="FOUNDATION">Foundation</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </LearningField>
          <div className="md:col-span-2">
            <LearningField label="Description">
              <textarea
                className={`${learningInput} min-h-[90px]`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Who is this path for and what will they achieve?"
              />
            </LearningField>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Publish this path so learners can enroll
          </label>
        </div>
      </section>

      <LearningPanel
        title="Path curriculum"
        description="Courses are completed in the order shown. Use the arrows to reorder."
        icon={Layers3}
      >
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="min-w-[240px] flex-1 space-y-1.5">
            <span className="block text-xs font-semibold text-gray-700">Add a course</span>
            <select
              className={learningSelect}
              value={selectedCourse}
              onChange={(event) => setSelectedCourse(event.target.value)}
            >
              <option value="">Select a course</option>
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                  {course.status !== "PUBLISHED" ? ` (${course.status.toLowerCase()})` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => void addCourse()}
            disabled={saving || !selectedCourse}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Add course
          </button>
        </div>

        {courses.length === 0 ? (
          <LearningEmpty
            icon={Layers3}
            title="No courses in this path yet"
            description="Add published courses above to build the learning journey."
          />
        ) : (
          <ol className="space-y-2">
            {courses.map((link, index) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/training/creator/courses/${link.courseId}`}
                      className="truncate text-sm font-semibold text-gray-900 hover:text-violet-700"
                    >
                      {link.course.title}
                    </Link>
                    <LearningStatus value={link.course.status} />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {link.course.provider || "Company learning"} ·{" "}
                    {formatLearningDuration(link.course.durationMinutes)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => void moveCourse(link.id, "up")}
                    disabled={index === 0 || busyLinkId === link.id}
                    title="Move up"
                    className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void moveCourse(link.id, "down")}
                    disabled={index === courses.length - 1 || busyLinkId === link.id}
                    title="Move down"
                    className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void removeCourse(link.id, link.course.title)}
                    disabled={busyLinkId === link.id}
                    title="Remove from path"
                    className="rounded-md border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </LearningPanel>

      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5 text-sm text-violet-900">
        <p className="font-semibold">How paths work</p>
        <p className="mt-1 text-violet-800">
          Learners complete courses in sequence. Assign the whole path from the assignments
          page and every published course inside it is enrolled automatically.
        </p>
      </div>
    </div>
  );
}
