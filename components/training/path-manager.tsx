"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Compass,
  Eye,
  Pencil,
  Plus,
  Route,
  Search,
  Trash2,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
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
import type { LearningPath } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

export function PathManager() {
  const { data, error, reload } = useLearningWorkspace();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const paths = useMemo(() => data?.paths ?? [], [data?.paths]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return paths;
    return paths.filter((path) =>
      [path.title, path.description, path.level]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [paths, search]);

  const toggle = async (path: LearningPath) => {
    setBusyId(path.id);
    try {
      await learningAction({
        action: "path.update",
        pathId: path.id,
        isActive: !path.isActive,
      });
      notify.success(path.isActive ? "Path unpublished." : "Path published.");
      await reload(false);
    } catch (toggleError) {
      notify.error(errorMessage(toggleError, "The path could not be updated."));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (path: LearningPath) => {
    if (!window.confirm(`Delete the learning path “${path.title}”?`)) return;
    setBusyId(path.id);
    try {
      await learningAction({ action: "path.delete", pathId: path.id });
      notify.success("Path deleted.");
      await reload(false);
    } catch (deleteError) {
      notify.error(errorMessage(deleteError, "The path could not be deleted."));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data) return <LearningSkeleton rows={4} />;

  return (
    <div className="space-y-5 pb-8">
      <LearningPanel
        title="Path builder"
        description="Bundle published courses into guided programmes."
        icon={Route}
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" /> New path
          </button>
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
                ? "Create a path, add courses in order, then publish it to the catalog."
                : "Try a different search term."
            }
            action={
              <button
                onClick={() => setCreateOpen(true)}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Create a path
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((path) => {
              const courseCount = path.courses?.length ?? path._count?.courses ?? 0;
              return (
                <article key={path.id} className="flex min-h-[210px] flex-col rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      <Route className="h-5 w-5" />
                    </span>
                    <LearningStatus value={path.isActive ? "PUBLISHED" : "DRAFT"} />
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-gray-900">{path.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                    {path.description || "No description yet."}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {courseCount} courses · {path._count?.assignments ?? 0} enrolled
                    {path.updatedAt ? ` · updated ${formatLearningDate(path.updatedAt)}` : ""}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center justify-end gap-1.5 pt-4">
                    <Link
                      href={`/training/paths/${path.id}`}
                      title="View path"
                      className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/training/creator/paths/${path.id}`}
                      title="Edit path"
                      className="rounded-md border border-violet-200 bg-violet-50 p-1.5 text-violet-700 hover:bg-violet-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => void toggle(path)}
                      disabled={busyId === path.id}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50",
                        path.isActive
                          ? "border border-gray-200 text-gray-700 hover:bg-gray-50"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      )}
                    >
                      {path.isActive ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => void remove(path)}
                      disabled={busyId === path.id}
                      title="Delete path"
                      className="rounded-md border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
      description="Name the path, then add courses in the path editor."
    >
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Title</span>
          <input className={learningInput} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Description</span>
          <textarea className={`${learningInput} min-h-[80px]`} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Level</span>
          <select className={learningSelect} value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="">All levels</option>
            <option value="FOUNDATION">Foundation</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
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
