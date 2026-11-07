"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Layers3,
  Plus,
  Route,
  Search,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useLearningWorkspace } from "@/components/training/use-learning-workspace";
import {
  LearningEmpty,
  LearningError,
  LearningPanel,
  LearningProgress,
  LearningSkeleton,
  LearningStatus,
  formatLearningDuration,
  learningInput,
  learningSelect,
} from "@/components/training/learning-ui";
import { errorMessage, learningAction } from "@/components/training/learning-actions";
import { notify } from "@/lib/toast";

export function LearningPaths() {
  const { data, error, reload } = useLearningWorkspace();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const paths = useMemo(() => data?.paths ?? [], [data?.paths]);
  const assignments = data?.assignments ?? [];
  const isCreator = data?.access.isCreator ?? false;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return paths.filter((path) => {
      if (isCreator) return true;
      if (!path.isActive) return false;
      if (!query) return true;
      return [path.title, path.description, path.level]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [paths, search, isCreator]);

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data) return <LearningSkeleton rows={4} />;

  return (
    <div className="space-y-5 pb-8">
      <LearningPanel
        title="Learning paths"
        description="Guided multi-course programmes that build skills step by step."
        icon={Route}
        action={
          data.access.isCreator ? (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" /> New path
            </button>
          ) : undefined
        }
      >
        <label className="relative mb-4 block max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className={`${learningInput} pl-9`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search learning paths"
          />
        </label>

        {visible.length === 0 ? (
          <LearningEmpty
            icon={Compass}
            title={paths.length === 0 ? "No learning paths yet" : "No paths match your search"}
            description={
              paths.length === 0
                ? data.access.isCreator
                  ? "Bundle courses into a path to guide learners from foundation to mastery."
                  : "Your company has not published any learning paths yet."
                : "Try a different search term."
            }
            action={
              data.access.isCreator ? (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Create a path
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((path) => {
              const pathAssignments = assignments.filter(
                (item) =>
                  item.pathId === path.id &&
                  item.employeeId === data.access.employeeId
              );
              const completed = pathAssignments.filter(
                (item) => item.status === "COMPLETED"
              ).length;
              const total = path.courses?.length ?? path._count?.courses ?? 0;
              const progress =
                total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <article
                  key={path.id}
                  className="flex min-h-[220px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      <Route className="h-5 w-5" />
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {data.access.isCreator && (
                        <LearningStatus value={path.isActive ? "PUBLISHED" : "DRAFT"} />
                      )}
                      {path.level && (
                        <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500">
                          {path.level}
                        </span>
                      )}
                    </div>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-gray-900">
                    {path.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">
                    {path.description || "Path details have not been added yet."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Layers3 className="h-3.5 w-3.5" /> {total} courses
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {formatLearningDuration(
                        (path.courses ?? []).reduce(
                          (sum, item) => sum + (item.course.durationMinutes ?? 0),
                          0
                        ) || null
                      )}
                    </span>
                  </div>
                  {pathAssignments.length > 0 && (
                    <div className="mt-3">
                      <LearningProgress
                        value={progress}
                        tone={progress >= 100 ? "emerald" : "violet"}
                      />
                      <p className="mt-1 text-[11px] text-gray-500">
                        {completed} of {total} courses complete
                      </p>
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                    <span className="text-xs text-gray-500">
                      {path._count?.assignments ?? 0} enrolled
                    </span>
                    <div className="flex items-center gap-2">
                      {data.access.isCreator && (
                        <Link
                          href={`/training/creator/paths/${path.id}`}
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                      )}
                      <Link
                        href={`/training/paths/${path.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                      >
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </LearningPanel>

      <CreatePathDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void reload(false);
        }}
      />
    </div>
  );
}

function CreatePathDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      notify.error("Enter a path title.");
      return;
    }
    setBusy(true);
    try {
      await learningAction({
        action: "path.create",
        title,
        description: description || null,
        level: level || null,
      });
      notify.success("Learning path created.");
      setTitle("");
      setDescription("");
      setLevel("");
      onCreated();
    } catch (createError) {
      notify.error(errorMessage(createError, "The path could not be created."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New learning path"
      description="Name the path, then add courses to build the journey."
    >
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Title</span>
          <input
            className={learningInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. New Manager Foundations"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Description</span>
          <textarea
            className={`${learningInput} min-h-[80px]`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Who is this path for and what will they achieve?"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Level</span>
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
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create path"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
