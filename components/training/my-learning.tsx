"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LibraryBig,
  PlayCircle,
  Search,
} from "lucide-react";
import { useLearningWorkspace } from "@/components/training/use-learning-workspace";
import {
  LearningEmpty,
  LearningError,
  LearningProgress,
  LearningSkeleton,
  LearningStat,
  LearningStatus,
  formatLearningDate,
  isOverdue,
  learningInput,
} from "@/components/training/learning-ui";
import type { LearningAssignment } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type Tab = "ALL" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

export function MyLearning() {
  const { data, error, reload } = useLearningWorkspace();
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");

  const employeeId = data?.access.employeeId;

  const mine = useMemo(
    () =>
      (data?.assignments ?? []).filter(
        (item) => item.employeeId === employeeId
      ),
    [data?.assignments, employeeId]
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return mine.filter((item) => {
      if (tab === "IN_PROGRESS" && item.status !== "IN_PROGRESS" && item.status !== "ASSIGNED") {
        return false;
      }
      if (tab === "COMPLETED" && item.status !== "COMPLETED") return false;
      if (tab === "OVERDUE" && !isOverdue(item.dueDate, item.status)) return false;
      if (!query) return true;
      return [item.course.title, item.course.provider, item.path?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [mine, tab, search]);

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data) return <LearningSkeleton rows={4} />;

  const completed = mine.filter((item) => item.status === "COMPLETED").length;
  const active = mine.filter((item) => item.status !== "COMPLETED").length;
  const overdue = mine.filter((item) => isOverdue(item.dueDate, item.status)).length;
  const averageProgress =
    mine.length > 0
      ? Math.round(
          mine.reduce((total, item) => total + item.progressPercent, 0) / mine.length
        )
      : 0;

  return (
    <div className="space-y-5 pb-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <LearningStat icon={GraduationCap} label="Assigned" value={String(mine.length)} />
        <LearningStat icon={Clock3} label="In progress" value={String(active)} />
        <LearningStat icon={CheckCircle2} label="Completed" value={String(completed)} />
        <LearningStat
          icon={ArrowRight}
          label="Average progress"
          value={`${averageProgress}%`}
          hint={overdue > 0 ? `${overdue} overdue` : "On track"}
        />
      </section>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-gray-50 p-1">
            {(
              [
                ["ALL", "All"],
                ["IN_PROGRESS", "In progress"],
                ["COMPLETED", "Completed"],
                ["OVERDUE", "Overdue"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  tab === value
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative w-full sm:max-w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className={`${learningInput} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your courses"
            />
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <LearningEmpty
          icon={GraduationCap}
          title={
            mine.length === 0
              ? "You have no learning assignments yet"
              : "Nothing matches this filter"
          }
          description={
            mine.length === 0
              ? "Browse the course catalog to enroll in a course, or ask your manager for a learning path."
              : "Try a different tab or clear your search."
          }
          action={
            mine.length === 0 ? (
              <Link
                href="/training/catalog"
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Browse catalog
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((item) => (
            <AssignmentCard key={item.id} assignment={item} />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <LibraryBig className="h-4 w-4" />
            Want to learn something new?
          </div>
          <Link
            href="/training/catalog"
            className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline"
          >
            Explore the catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: LearningAssignment }) {
  const overdue = isOverdue(assignment.dueDate, assignment.status);
  const done = assignment.status === "COMPLETED";
  return (
    <article className="flex min-h-[230px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <LearningStatus value={overdue ? "OVERDUE" : assignment.status} />
          {assignment.source === "SELF" && (
            <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500">
              Self enrolled
            </span>
          )}
        </div>
      </div>
      <h2 className="mt-3 text-base font-semibold text-gray-900">
        {assignment.course.title}
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        {assignment.path?.title ? `${assignment.path.title} · ` : ""}
        Due {formatLearningDate(assignment.dueDate)}
      </p>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-medium text-gray-500">
          <span>Progress</span>
          <span className="font-semibold text-gray-900">
            {assignment.progressPercent}%
          </span>
        </div>
        <LearningProgress
          value={assignment.progressPercent}
          tone={done ? "emerald" : overdue ? "amber" : "violet"}
          className="mt-2"
        />
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <span className="text-xs text-gray-500">
          {assignment.course.provider || "Company learning"}
        </span>
        <Link
          href={`/training/my-learning/${assignment.id}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
            done
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-violet-600 text-white hover:bg-violet-700"
          )}
        >
          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
          {done ? "Review" : assignment.progressPercent > 0 ? "Continue" : "Start"}
        </Link>
      </div>
    </article>
  );
}
