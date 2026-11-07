"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Grid2X2,
  Layers3,
  LibraryBig,
  List,
  Plus,
  Users,
} from "lucide-react";
import { useLearningWorkspace } from "@/components/training/use-learning-workspace";
import {
  LearningEmpty,
  LearningError,
  LearningProgress,
  LearningSkeleton,
  LearningStatus,
  LearningToolbar,
  courseFormatLabel,
  courseLevelLabel,
  formatLearningDuration,
  learningSelect,
} from "@/components/training/learning-ui";
import { notify, readApiError } from "@/lib/toast";

export function CourseCatalog() {
  const { data, loading, error, reload } = useLearningWorkspace();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [level, setLevel] = useState("ALL");
  const [format, setFormat] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [busyId, setBusyId] = useState<string | null>(null);

  const courses = useMemo(() => data?.courses ?? [], [data?.courses]);
  const assignments = data?.assignments ?? [];
  const access = data?.access;

  const categories = useMemo(
    () =>
      [...new Set(courses.map((course) => course.category).filter(Boolean))] as string[],
    [courses]
  );
  const levels = useMemo(
    () => [...new Set(courses.map((course) => course.level).filter(Boolean))] as string[],
    [courses]
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (!access?.isCreator && course.status !== "PUBLISHED") return false;
      if (status !== "ALL" && course.status !== status) return false;
      if (category !== "ALL" && course.category !== category) return false;
      if (level !== "ALL" && course.level !== level) return false;
      if (format !== "ALL" && course.format !== format) return false;
      if (!query) return true;
      return [course.title, course.description, course.provider, course.category, course.tags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [courses, search, status, category, level, format, access?.isCreator]);

  const enroll = async (courseId: string) => {
    setBusyId(courseId);
    try {
      const response = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enroll", courseId }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "You could not be enrolled."));
      }
      notify.success("You are enrolled. Open My learning to start.");
      await reload(false);
    } catch (enrollError) {
      notify.error(
        enrollError instanceof Error ? enrollError.message : "You could not be enrolled."
      );
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select className={learningSelect} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
              <option value="ALL">All categories</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className={learningSelect} value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Filter by level">
              <option value="ALL">All levels</option>
              {levels.map((item) => <option key={item} value={item}>{courseLevelLabel(item)}</option>)}
            </select>
            <select className={learningSelect} value={format} onChange={(event) => setFormat(event.target.value)} aria-label="Filter by format">
              <option value="ALL">All formats</option>
              <option value="SELF_PACED">Self-paced</option>
              <option value="INSTRUCTOR_LED">Instructor-led</option>
              <option value="BLENDED">Blended</option>
              <option value="EXTERNAL">External</option>
            </select>
            {access?.isCreator && (
              <select className={learningSelect} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
                <option value="ALL">All statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
              <button onClick={() => setView("grid")} className={`rounded-md p-1.5 ${view === "grid" ? "bg-violet-50 text-violet-700" : "text-gray-500"}`} aria-label="Grid view"><Grid2X2 className="h-4 w-4" /></button>
              <button onClick={() => setView("list")} className={`rounded-md p-1.5 ${view === "list" ? "bg-violet-50 text-violet-700" : "text-gray-500"}`} aria-label="List view"><List className="h-4 w-4" /></button>
            </div>
            {access?.isCreator && (
              <Link href="/training/creator/courses/new" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                <Plus className="h-4 w-4" /> New course
              </Link>
            )}
          </div>
        </div>
      </div>

      <LearningToolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search courses, providers, tags"
        label={`${visible.length} course${visible.length === 1 ? "" : "s"}`}
      />

      {loading ? (
        <LearningSkeleton rows={6} />
      ) : visible.length === 0 ? (
        <LearningEmpty
          icon={LibraryBig}
          title={search || category !== "ALL" || level !== "ALL" ? "No courses match these filters" : "The catalog is empty"}
          description={
            search || category !== "ALL" || level !== "ALL"
              ? "Clear a filter or search for a different course."
              : access?.isCreator
                ? "Create your first course, add modules and lessons, then publish it."
                : "Your company has not published any learning courses yet."
          }
          action={access?.isCreator ? <Link href="/training/creator/courses/new" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">Create a course</Link> : undefined}
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((course) => {
            const assignment = assignments.find((item) => item.courseId === course.id && item.employeeId === access?.employeeId);
            return (
              <article key={course.id} className="flex min-h-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><BookOpen className="h-5 w-5" /></span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {access?.isCreator && <LearningStatus value={course.status} />}
                    <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500">{formatLearningDuration(course.durationMinutes)}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-gray-500">
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">{courseLevelLabel(course.level)}</span>
                  <span className="rounded-full bg-gray-50 px-2 py-0.5">{courseFormatLabel(course.format)}</span>
                  {course.category && <span className="rounded-full bg-gray-50 px-2 py-0.5">{course.category}</span>}
                </div>
                <h2 className="mt-3 text-base font-semibold text-gray-900">{course.title}</h2>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-gray-600">{course.description || "Course details have not been added yet."}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" />{course._count?.modules ?? 0} modules</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course._count?.assignments ?? 0} assigned</span>
                </div>
                {assignment && assignment.status !== "COMPLETED" && (
                  <div className="mt-3">
                    <LearningProgress value={assignment.progressPercent} />
                    <p className="mt-1 text-[11px] text-gray-500">{assignment.progressPercent}% complete</p>
                  </div>
                )}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
                  <span className="text-xs font-medium text-gray-500">{course.provider || "Company learning"}</span>
                  <div className="flex items-center gap-2">
                    {access?.isCreator && <Link href={`/training/creator/courses/${course.id}`} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Edit</Link>}
                    {assignment ? (
                      <Link href={`/training/my-learning/${assignment.id}`} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
                        {assignment.status === "COMPLETED" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                        {assignment.status === "COMPLETED" ? "Review" : "Continue"}
                      </Link>
                    ) : (
                      <Link href={`/training/catalog/${course.id}`} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,2fr)_130px_130px_120px_160px] gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 md:grid">
            <span>Course</span><span>Level</span><span>Format</span><span>Assigned</span><span>Action</span>
          </div>
          <div className="divide-y divide-gray-100">
            {visible.map((course) => {
              const assignment = assignments.find((item) => item.courseId === course.id && item.employeeId === access?.employeeId);
              return (
                <div key={course.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,2fr)_130px_130px_120px_160px] md:items-center md:gap-4 md:px-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-gray-900">{course.title}</h3>
                      {access?.isCreator && <LearningStatus value={course.status} />}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">{course.provider || "Company learning"} · {course.category || "General"}</p>
                  </div>
                  <span className="text-sm text-gray-600">{courseLevelLabel(course.level)}</span>
                  <span className="text-sm text-gray-600">{courseFormatLabel(course.format)}</span>
                  <span className="text-sm text-gray-600">{course._count?.assignments ?? 0}</span>
                  <div className="flex items-center gap-2">
                    {assignment ? (
                      <Link href={`/training/my-learning/${assignment.id}`} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">Continue</Link>
                    ) : (
                      <>
                        <Link href={`/training/catalog/${course.id}`} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">View</Link>
                        {!access?.isCreator && (
                          <button onClick={() => void enroll(course.id)} disabled={busyId === course.id} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                            {busyId === course.id ? "Enrolling…" : "Enroll"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
