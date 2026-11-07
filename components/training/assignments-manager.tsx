"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  UserRoundCheck,
  Users,
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
  formatLearningDate,
  isOverdue,
  learningInput,
  learningSelect,
} from "@/components/training/learning-ui";
import { errorMessage, learningAction } from "@/components/training/learning-actions";
import { notify } from "@/lib/toast";
import type { LearningAssignment } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

export function AssignmentsManager() {
  const { data, error, reload } = useLearningWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [employee, setEmployee] = useState("ALL");
  const [assignOpen, setAssignOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const assignments = useMemo(
    () => data?.assignments ?? [],
    [data?.assignments]
  );
  const employees = data?.employees ?? [];

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assignments.filter((item) => {
      if (status === "OVERDUE" && !isOverdue(item.dueDate, item.status)) return false;
      if (status !== "ALL" && status !== "OVERDUE" && item.status !== status) return false;
      if (employee !== "ALL" && item.employeeId !== employee) return false;
      if (!query) return true;
      return [
        item.course.title,
        item.employee.firstName,
        item.employee.lastName,
        item.employee.employeeCode,
        item.path?.title,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [assignments, search, status, employee]);

  const run = async (body: Record<string, unknown>, success: string) => {
    try {
      await learningAction(body);
      notify.success(success);
      await reload(false);
    } catch (actionError) {
      notify.error(errorMessage(actionError, "The change could not be saved."));
    }
  };

  const act = async (
    assignment: LearningAssignment,
    action: "assignment.update" | "assignment.reset" | "assignment.delete"
  ) => {
    if (action === "assignment.delete") {
      if (!window.confirm(`Remove ${assignment.course.title} from ${assignment.employee.firstName}?`)) {
        return;
      }
    }
    setBusyId(assignment.id);
    try {
      if (action === "assignment.update") {
        await run(
          { action, assignmentId: assignment.id, status: "COMPLETED" },
          "Assignment marked complete."
        );
      } else {
        await run(
          { action, assignmentId: assignment.id },
          action === "assignment.reset"
            ? "Assignment progress reset."
            : "Assignment removed."
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data) return <LearningSkeleton rows={4} />;

  const counts = {
    all: assignments.length,
    active: assignments.filter((item) => item.status !== "COMPLETED").length,
    completed: assignments.filter((item) => item.status === "COMPLETED").length,
    overdue: assignments.filter((item) => isOverdue(item.dueDate, item.status)).length,
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="All assignments" value={counts.all} />
        <Summary label="Active" value={counts.active} />
        <Summary label="Completed" value={counts.completed} />
        <Summary label="Overdue" value={counts.overdue} tone={counts.overdue ? "danger" : undefined} />
      </div>

      <LearningPanel
        title="Training assignments"
        description="Assign courses or whole learning paths to your team and track progress live."
        icon={UserRoundCheck}
        action={
          <button
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <UserPlus className="h-4 w-4" /> Assign training
          </button>
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
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          {employees.length > 0 && (
            <select
              className={`${learningSelect} w-auto`}
              value={employee}
              onChange={(event) => setEmployee(event.target.value)}
              aria-label="Filter by employee"
            >
              <option value="ALL">All employees</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName}
                </option>
              ))}
            </select>
          )}
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className={`${learningInput} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee or course"
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <LearningEmpty
            icon={UserRoundCheck}
            title={assignments.length === 0 ? "No assignments yet" : "No assignments match these filters"}
            description={
              assignments.length === 0
                ? "Assign a course or learning path to start tracking completion."
                : "Try a different status, employee or search term."
            }
            action={
              <button
                onClick={() => setAssignOpen(true)}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Assign training
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="hidden min-w-[860px] grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_120px_170px_150px] gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 lg:grid">
              <span>Employee</span>
              <span>Course</span>
              <span>Progress</span>
              <span>Due / status</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-gray-100">
              {visible.map((item) => (
                <div
                  key={item.id}
                  className="grid min-w-[860px] gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_120px_170px_150px] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {item.employee.firstName} {item.employee.lastName}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {item.employee.employeeCode}
                      {item.employee.department?.name
                        ? ` · ${item.employee.department.name}`
                        : ""}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/training/catalog/${item.courseId}`}
                      className="block truncate text-sm font-medium text-gray-900 hover:text-violet-700"
                    >
                      {item.course.title}
                    </Link>
                    <p className="truncate text-[11px] text-gray-500">
                      {item.path?.title ? `${item.path.title} · ` : ""}
                      {item.source === "SELF" ? "Self enrolled" : "Assigned"}
                    </p>
                  </div>
                  <div>
                    <LearningProgress
                      value={item.progressPercent}
                      tone={item.progressPercent >= 100 ? "emerald" : "violet"}
                    />
                    <p className="mt-1 text-[11px] font-medium text-gray-500">
                      {item.progressPercent}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-500">
                      Due {formatLearningDate(item.dueDate)}
                    </p>
                    <LearningStatus
                      value={isOverdue(item.dueDate, item.status) ? "OVERDUE" : item.status}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {item.status !== "COMPLETED" && (
                      <button
                        onClick={() => void act(item, "assignment.update")}
                        disabled={busyId === item.id}
                        title="Mark complete"
                        className="rounded-md border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => void act(item, "assignment.reset")}
                      disabled={busyId === item.id}
                      title="Reset progress"
                      className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void act(item, "assignment.delete")}
                      disabled={busyId === item.id}
                      title="Remove assignment"
                      className="rounded-md border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </LearningPanel>

      <AssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        courses={data.courses}
        paths={data.paths}
        employees={employees}
        onAssigned={() => {
          setAssignOpen(false);
          void reload(false);
        }}
      />
    </div>
  );
}

function AssignDialog({
  open,
  onClose,
  courses,
  paths,
  employees,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  courses: NonNullable<ReturnType<typeof useLearningWorkspace>["data"]>["courses"];
  paths: NonNullable<ReturnType<typeof useLearningWorkspace>["data"]>["paths"];
  employees: NonNullable<ReturnType<typeof useLearningWorkspace>["data"]>["employees"];
  onAssigned: () => void;
}) {
  const [mode, setMode] = useState<"COURSE" | "PATH">("COURSE");
  const [courseId, setCourseId] = useState("");
  const [pathId, setPathId] = useState("");
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const availableCourses = courses.filter(
    (course) => course.status === "PUBLISHED" && course.isActive
  );

  const submit = async () => {
    if (employeeIds.length === 0) {
      notify.error("Choose at least one employee.");
      return;
    }
    if (mode === "COURSE" && !courseId) {
      notify.error("Choose a course to assign.");
      return;
    }
    if (mode === "PATH" && !pathId) {
      notify.error("Choose a learning path to assign.");
      return;
    }
    setBusy(true);
    try {
      await learningAction({
        action: "assignment.bulk",
        employeeIds,
        ...(mode === "COURSE" ? { courseId } : { pathId }),
        dueDate: dueDate || null,
        notes: notes || null,
      });
      notify.success(
        `Training assigned to ${employeeIds.length} employee${employeeIds.length === 1 ? "" : "s"}.`
      );
      setEmployeeIds([]);
      setCourseId("");
      setPathId("");
      setDueDate("");
      setNotes("");
      onAssigned();
    } catch (assignError) {
      notify.error(errorMessage(assignError, "Training could not be assigned."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Assign training"
      description="Choose a course or learning path and the people who should complete it."
      size="lg"
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
          {(["COURSE", "PATH"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold",
                mode === value ? "bg-violet-600 text-white" : "text-gray-600"
              )}
            >
              {value === "COURSE" ? "Single course" : "Learning path"}
            </button>
          ))}
        </div>

        {mode === "COURSE" ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Course</span>
            <select
              className={learningSelect}
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="">Select a published course</option>
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {availableCourses.length === 0 && (
              <span className="text-[11px] text-amber-700">
                Publish a course before assigning it.
              </span>
            )}
          </label>
        ) : (
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Learning path</span>
            <select
              className={learningSelect}
              value={pathId}
              onChange={(event) => setPathId(event.target.value)}
            >
              <option value="">Select a learning path</option>
              {paths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.title} ({path.courses?.length ?? path._count?.courses ?? 0} courses)
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Due date</span>
            <input
              type="date"
              className={learningInput}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Note (optional)</span>
            <input
              className={learningInput}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Context for the learner"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">
              Employees ({employeeIds.length} selected)
            </span>
            <button
              onClick={() =>
                setEmployeeIds(
                  employeeIds.length === employees.length
                    ? []
                    : employees.map((item) => item.id)
                )
              }
              className="text-[11px] font-semibold text-violet-700 hover:underline"
            >
              {employeeIds.length === employees.length ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-2">
            {employees.length === 0 ? (
              <p className="p-2 text-xs text-gray-500">
                No employees are available in your learning scope.
              </p>
            ) : (
              employees.map((item) => {
                const checked = employeeIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                      checked ? "bg-violet-50 text-violet-800" : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setEmployeeIds((current) =>
                          current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id]
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {item.firstName} {item.lastName}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {item.department?.name ?? item.employeeCode}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

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
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            <Users className="h-4 w-4" />
            {busy ? "Assigning…" : "Assign training"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tabular-nums",
          tone === "danger" ? "text-rose-600" : "text-gray-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
