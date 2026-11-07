"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  Eye,
  FilePlus2,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Users,
} from "lucide-react";
import { useLearningWorkspace } from "@/components/training/use-learning-workspace";
import {
  LearningEmpty,
  LearningError,
  LearningPanel,
  LearningSkeleton,
  LearningStatus,
  formatLearningDate,
  learningInput,
  learningSelect,
} from "@/components/training/learning-ui";
import { errorMessage, learningAction } from "@/components/training/learning-actions";
import { notify } from "@/lib/toast";
import type { LearningCourse } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

export function CourseManager() {
  const { data, error, reload } = useLearningWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const courses = useMemo(() => data?.courses ?? [], [data?.courses]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (status !== "ALL" && course.status !== status) return false;
      if (!query) return true;
      return [course.title, course.code, course.category, course.provider, course.tags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [courses, search, status]);

  const act = async (course: LearningCourse, action: string, message: string) => {
    setBusyId(course.id);
    try {
      await learningAction({ action, courseId: course.id });
      notify.success(message);
      await reload(false);
    } catch (actionError) {
      notify.error(errorMessage(actionError, "The course could not be updated."));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data) return <LearningSkeleton rows={4} />;

  const drafts = courses.filter((course) => course.status === "DRAFT").length;
  const published = courses.filter((course) => course.status === "PUBLISHED").length;
  const archived = courses.filter((course) => course.status === "ARCHIVED").length;

  return (
    <div className="space-y-5 pb-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="All courses" value={courses.length} />
        <Summary label="Published" value={published} />
        <Summary label="Drafts" value={drafts} tone={drafts ? "warning" : undefined} />
        <Summary label="Archived" value={archived} />
      </div>

      <LearningPanel
        title="Course manager"
        description="Author course metadata, curriculum and publishing state."
        icon={BookOpen}
        action={
          <Link
            href="/training/creator/courses/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" /> New course
          </Link>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            className={`${learningSelect} w-auto`}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className={`${learningInput} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses"
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <LearningEmpty
            icon={courses.length === 0 ? FilePlus2 : BookOpen}
            title={courses.length === 0 ? "No courses yet" : "No courses match these filters"}
            description={
              courses.length === 0
                ? "Create a course, add modules and lessons, then publish it to the catalog."
                : "Try a different status or search term."
            }
            action={
              <Link
                href="/training/creator/courses/new"
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Create a course
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="hidden min-w-[900px] grid-cols-[minmax(0,1.8fr)_120px_110px_110px_140px_260px] gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 lg:grid">
              <span>Course</span>
              <span>Status</span>
              <span>Curriculum</span>
              <span>Learners</span>
              <span>Updated</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-gray-100">
              {visible.map((course) => (
                <div
                  key={course.id}
                  className="grid min-w-[900px] gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.8fr)_120px_110px_110px_140px_260px] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/training/creator/courses/${course.id}`}
                        className="truncate text-sm font-semibold text-gray-900 hover:text-violet-700"
                      >
                        {course.title}
                      </Link>
                      {course.code && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                          {course.code}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-gray-500">
                      {course.category || "General"} · {course.provider || "Company learning"}
                    </p>
                  </div>
                  <LearningStatus value={course.status} />
                  <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <Layers3 className="h-3.5 w-3.5 text-gray-400" />
                    {course._count?.modules ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {course._count?.assignments ?? 0}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {formatLearningDate(course.updatedAt)}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Link
                      href={`/training/catalog/${course.id}`}
                      title="Preview"
                      className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/training/creator/courses/${course.id}`}
                      title="Edit"
                      className="rounded-md border border-violet-200 bg-violet-50 p-1.5 text-violet-700 hover:bg-violet-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    {course.status === "DRAFT" && (
                      <button
                        onClick={() => void act(course, "course.update", "Course published.")}
                        disabled={busyId === course.id}
                        title="Publish"
                        className="rounded-md border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {course.status === "PUBLISHED" && (
                      <>
                        <button
                          onClick={() => void act(course, "course.archive", "Course archived.")}
                          disabled={busyId === course.id}
                          title="Archive"
                          className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          href={`/training/creator/courses/${course.id}`}
                          title="Manage curriculum"
                          className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </>
                    )}
                    {course.status === "ARCHIVED" && (
                      <button
                        onClick={() => void act(course, "course.restore", "Course restored.")}
                        disabled={busyId === course.id}
                        title="Restore"
                        className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </LearningPanel>

      {drafts > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            {drafts} draft course{drafts === 1 ? "" : "s"} not visible to learners
          </p>
          <p className="mt-1 text-amber-800">
            Open a course to finish its curriculum, then publish it from the editor.
          </p>
        </div>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning";
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tabular-nums",
          tone === "warning" ? "text-amber-600" : "text-gray-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
