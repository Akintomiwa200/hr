"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarDays,
  Check,
  FileText,
  Filter,
  LayoutGrid,
  List,
  ListChecks,
  MessageSquare,
  Plus,
  Search,
  User,
} from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { useAppEvents } from "@/hooks/use-app-events";
import { ChecklistTaskDetailSheet } from "./checklist-task-detail-sheet";

export type TodoTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
  instance: {
    id: string;
    type: string;
    employee: { id: string; firstName: string; lastName: string };
  };
  taskType?: string;
  requiredDocuments?: string[];
  files?: Array<{
    id: string;
    documentName: string;
    fileName: string;
    fileUrl: string;
    createdAt: string;
  }>;
  _count?: { comments: number };
};

type EmployeeOption = { id: string; firstName: string; lastName: string };

const PRIORITY_VARIANT: Record<string, "neutral" | "info" | "warning" | "error"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "error",
};

const COLUMNS = [
  { key: "PENDING", label: "To Do", color: "border-gray-200 bg-gradient-to-b from-gray-50/60 to-white" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-blue-200 bg-gradient-to-b from-blue-50/40 to-white" },
  { key: "COMPLETED", label: "Done", color: "border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white" },
] as const;

export function ChecklistTodosModule({
  canManage,
  employees,
  currentEmployeeId,
}: {
  canManage: boolean;
  employees: EmployeeOption[];
  currentEmployeeId: string | null;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "list" | "checklist" | "timeline">("board");
  const [dragId, setDragId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TodoTask | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({
    status: "ACTIVE",
    priority: "ALL",
    type: "ALL",
    assigneeId: canManage ? "ALL" : currentEmployeeId ?? "ALL",
    search: "",
  });
  const [form, setForm] = useState({
    title: "",
    description: "",
    employeeId: employees[0]?.id ?? "",
    checklistType: "ONBOARDING" as "ONBOARDING" | "OFFBOARDING",
    assigneeId: "",
    dueDate: "",
    priority: "MEDIUM",
    requiredDocuments: "",
  });

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    q.set("status", view === "board" ? "BOARD" : filters.status);
    if (filters.priority !== "ALL") q.set("priority", filters.priority);
    if (filters.type !== "ALL") q.set("type", filters.type);
    if (filters.assigneeId !== "ALL") q.set("assigneeId", filters.assigneeId);
    if (filters.search.trim()) q.set("search", filters.search.trim());
    return q.toString();
  }, [filters, view]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/checklist/tasks?${buildQuery()}`, {
        cache: "no-store",
      });
      if (res.ok) setTasks(await res.json());
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/checklist/tasks?${buildQuery()}`, {
          cache: "no-store",
        });
        if (!cancelled && res.ok) setTasks(await res.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildQuery]);

  useAppEvents({
    types: ["checklist_updated"],
    onEvent: () => {
      void load({ silent: true });
    },
  });

  const createTask = async () => {
    if (!form.title.trim() || !form.employeeId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/checklist/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          checklistType: form.checklistType,
          title: form.title,
          description: form.description,
          assigneeId: form.assigneeId || undefined,
          dueDate: form.dueDate || undefined,
          priority: form.priority,
          requiredDocuments: form.requiredDocuments,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create task"));
        return;
      }
      notify.success("Task created");
      setCreateOpen(false);
      setForm((f) => ({ ...f, title: "", description: "", dueDate: "", requiredDocuments: "" }));
      load();
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (taskId: string, status: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    const res = await fetch(`/api/checklist/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(status === "COMPLETED" ? { action: "complete" } : { status }),
    });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to update task"));
      load();
      return;
    }
    load({ silent: true });
  };

  const moveTask = (taskId: string, targetStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    updateStatus(taskId, targetStatus);
  };

  const activeCount = tasks.filter((t) => t.status !== "COMPLETED").length;

  const changeView = (next: typeof view) => {
    setView(next);
    // A checklist is only useful when completed items stay visible.
    if (next === "checklist") {
      setFilters((f) => (f.status === "ACTIVE" ? { ...f, status: "ALL" } : f));
    }
  };

  const toggleDone = (task: TodoTask) => {
    updateStatus(task.id, task.status === "COMPLETED" ? "PENDING" : "COMPLETED");
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search tasks…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="ACTIVE">Active</option>
          <option value="PENDING">To Do only</option>
          <option value="IN_PROGRESS">In Progress only</option>
          <option value="COMPLETED">Completed</option>
          <option value="ALL">All statuses</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="ALL">All priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="ALL">All types</option>
          <option value="ONBOARDING">Onboarding</option>
          <option value="OFFBOARDING">Offboarding</option>
        </select>

        {canManage && (
          <select
            value={filters.assigneeId}
            onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="ALL">All assignees</option>
            <option value="UNASSIGNED">Unassigned</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {fullName(emp.firstName, emp.lastName)}
              </option>
            ))}
          </select>
        )}

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => changeView("board")}
            className={`px-3 py-2 text-sm ${view === "board" ? "bg-violet-50 text-violet-700" : "bg-white text-gray-600"}`}
            aria-label="Board view"
            title="Board view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => changeView("list")}
            className={`px-3 py-2 text-sm border-l border-gray-200 ${view === "list" ? "bg-violet-50 text-violet-700" : "bg-white text-gray-600"}`}
            aria-label="List view"
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => changeView("checklist")}
            className={`px-3 py-2 text-sm border-l border-gray-200 ${view === "checklist" ? "bg-violet-50 text-violet-700" : "bg-white text-gray-600"}`}
            aria-label="Checklist view"
            title="Checklist view"
          >
            <ListChecks className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => changeView("timeline")}
            className={`px-3 py-2 text-sm border-l border-gray-200 ${view === "timeline" ? "bg-violet-50 text-violet-700" : "bg-white text-gray-600"}`}
            aria-label="Timeline view"
            title="Timeline view"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
        </div>

        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {loading ? "Loading…" : `${activeCount} active task${activeCount === 1 ? "" : "s"}`}
        {!canManage && " assigned to you"}
      </p>

      {loading ? (
        <Card className="p-8 text-center text-gray-500">Loading tasks…</Card>
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={Filter}
            title="No tasks match your filters"
            description={
              canManage
                ? "Create a task or start an onboarding checklist for an employee."
                : "When HR assigns you checklist tasks, they will appear here."
            }
          />
          {canManage && (
            <div className="flex justify-center gap-3 pb-8">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" />
                Create Task
              </Button>
              <Link href="/checklist/onboarding">
                <Button variant="secondary">Start Onboarding</Button>
              </Link>
            </div>
          )}
        </Card>
      ) : view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            const isOver = dragId !== null && colTasks.length === 0;
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  if (dragId) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = dragId ?? (e.dataTransfer.getData("text/plain") || null);
                  setDragId(null);
                  if (id && !colTasks.some((t) => t.id === id)) {
                    moveTask(id, col.key);
                  }
                }}
                className={`rounded-2xl border p-3 min-h-[320px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${col.color} ${
                  isOver ? "border-violet-400 ring-2 ring-violet-200" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="text-xs text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onOpen={() => setSelected(task)}
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : view === "checklist" ? (
        <TaskChecklistView tasks={tasks} onOpen={setSelected} onToggle={toggleDone} />
      ) : view === "timeline" ? (
        <TaskTimelineView tasks={tasks} onOpen={setSelected} />
      ) : (
        <Card className="rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-3">Task</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3">Assignee</th>
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      className="text-left font-medium text-gray-900 hover:text-violet-600"
                      onClick={() => setSelected(task)}
                    >
                      {task.title}
                      {(task._count?.comments ?? 0) > 0 && (
                        <span className="ml-2 inline-flex items-center text-xs text-gray-400">
                          <MessageSquare className="w-3 h-3 mr-0.5" />
                          {task._count?.comments}
                        </span>
                      )}
                      <span className="ml-2">
                        <DocumentBadge task={task} compact />
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={task.status === "COMPLETED" ? "success" : task.status === "IN_PROGRESS" ? "info" : "neutral"}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={PRIORITY_VARIANT[task.priority] ?? "neutral"}>{task.priority}</Badge>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{task.dueDate ? formatDate(task.dueDate) : "—"}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {task.assignee ? fullName(task.assignee.firstName, task.assignee.lastName) : "Unassigned"}
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {fullName(task.instance.employee.firstName, task.instance.employee.lastName)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <Link
                        href={`/checklist/tasks/${task.id}`}
                        className="px-2 py-1 text-xs font-medium text-brand-600 hover:underline"
                      >
                        Documents
                      </Link>
                      {task.status !== "COMPLETED" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(task.id, "COMPLETED")}>
                          Complete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ChecklistTaskDetailSheet
        taskId={selected?.id ?? null}
        canManage={canManage}
        employees={employees}
        onClose={() => setSelected(null)}
        onUpdated={() => {
          load();
          router.refresh();
        }}
      />

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Create Task">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Complete security training"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">For employee *</label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {fullName(emp.firstName, emp.lastName)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Checklist type</label>
              <select
                value={form.checklistType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checklistType: e.target.value as "ONBOARDING" | "OFFBOARDING" }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ONBOARDING">Onboarding</option>
                <option value="OFFBOARDING">Offboarding</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
              <select
                value={form.assigneeId}
                onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Anyone / unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {fullName(emp.firstName, emp.lastName)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required documents (optional)
            </label>
            <textarea
              value={form.requiredDocuments}
              onChange={(e) => setForm((f) => ({ ...f, requiredDocuments: e.target.value }))}
              rows={3}
              placeholder={"National ID\nSigned contract"}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={creating} onClick={createTask} disabled={!form.title.trim()}>
              Create Task
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

function TaskChecklistView({
  tasks,
  onOpen,
  onToggle,
}: {
  tasks: TodoTask[];
  onOpen: (task: TodoTask) => void;
  onToggle: (task: TodoTask) => void;
}) {
  const groups = COLUMNS.map((column) => ({
    ...column,
    tasks: tasks.filter((task) => task.status === column.key),
  })).filter((group) => group.tasks.length > 0);

  return (
    <Card className="overflow-hidden p-0">
      <div className="divide-y divide-gray-100">
        {groups.map((group) => (
          <section key={group.key} className="px-4 py-4 sm:px-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </h3>
              <span className="rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-400">
                {group.tasks.length}
              </span>
            </div>
            <ul className="space-y-1">
              {group.tasks.map((task) => {
                const done = task.status === "COMPLETED";
                const required = task.requiredDocuments ?? [];
                const uploaded = new Set(
                  (task.files ?? []).map((file) => file.documentName.trim().toLowerCase())
                );
                const overdue = isTaskOverdue(task);
                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => onToggle(task)}
                      aria-label={done ? "Mark task as not done" : "Mark task as done"}
                      title={done ? "Mark as not done" : "Mark as done"}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-gray-300 text-transparent hover:border-violet-400 hover:text-violet-300"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpen(task)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span
                        className={`block text-sm font-medium ${
                          done ? "text-gray-400 line-through" : "text-gray-900"
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                        <span>
                          {task.instance.type} ·{" "}
                          {fullName(task.instance.employee.firstName, task.instance.employee.lastName)}
                        </span>
                        {task.dueDate && (
                          <span className={overdue ? "font-medium text-red-500" : ""}>
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        <DocumentBadge task={task} compact />
                      </span>
                      {required.length > 0 && (
                        <span className="mt-1.5 block space-y-1">
                          {required.map((name) => {
                            const isUploaded = uploaded.has(name.trim().toLowerCase());
                            return (
                              <span
                                key={name}
                                className="flex items-center gap-2 text-xs text-gray-500"
                              >
                                <span
                                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                                    isUploaded
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-gray-300 text-transparent"
                                  }`}
                                >
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                                <span className={isUploaded ? "text-gray-400 line-through" : ""}>
                                  {name}
                                </span>
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </button>
                    <Badge variant={PRIORITY_VARIANT[task.priority] ?? "neutral"}>
                      {task.priority}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}

type TaskTimelineGroup = { key: string; label: string; tasks: TodoTask[] };

function isTaskOverdue(task: TodoTask) {
  return Boolean(task.dueDate && task.status !== "COMPLETED" && new Date(task.dueDate) < new Date());
}

function taskTimelineGroups(tasks: TodoTask[]): TaskTimelineGroup[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const groups: TaskTimelineGroup[] = [
    { key: "overdue", label: "Overdue", tasks: [] },
    { key: "today", label: "Today", tasks: [] },
    { key: "week", label: "Next 7 days", tasks: [] },
    { key: "later", label: "Later", tasks: [] },
    { key: "none", label: "No due date", tasks: [] },
    { key: "completed", label: "Completed", tasks: [] },
  ];

  for (const task of tasks) {
    if (task.status === "COMPLETED") {
      groups[5].tasks.push(task);
      continue;
    }
    if (!task.dueDate) {
      groups[4].tasks.push(task);
      continue;
    }
    const dueDay = new Date(task.dueDate);
    dueDay.setHours(0, 0, 0, 0);
    if (dueDay < start) groups[0].tasks.push(task);
    else if (dueDay.getTime() === start.getTime()) groups[1].tasks.push(task);
    else if (dueDay <= weekEnd) groups[2].tasks.push(task);
    else groups[3].tasks.push(task);
  }

  for (const group of groups) {
    group.tasks.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }

  return groups.filter((group) => group.tasks.length > 0);
}

function TaskTimelineView({
  tasks,
  onOpen,
}: {
  tasks: TodoTask[];
  onOpen: (task: TodoTask) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="divide-y divide-gray-100">
        {taskTimelineGroups(tasks).map((group) => (
          <section key={group.key} className="px-4 py-4 sm:px-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </h3>
              <span className="rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-400">
                {group.tasks.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {group.tasks.map((task) => (
                <TimelineTaskRow key={task.id} task={task} onOpen={() => onOpen(task)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}

function TimelineTaskRow({ task, onOpen }: { task: TodoTask; onOpen: () => void }) {
  const done = task.status === "COMPLETED";
  const overdue = isTaskOverdue(task);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-gray-50"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          done ? "bg-emerald-400" : overdue ? "bg-red-400" : "bg-violet-400"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-medium ${
            done ? "text-gray-400 line-through" : "text-gray-900"
          }`}
        >
          {task.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
          <span>
            {task.instance.type} ·{" "}
            {fullName(task.instance.employee.firstName, task.instance.employee.lastName)}
          </span>
          {task.dueDate && (
            <span className={overdue ? "font-medium text-red-500" : ""}>
              {formatDate(task.dueDate)}
            </span>
          )}
          <DocumentBadge task={task} compact />
        </span>
      </span>
      <Badge
        variant={
          task.status === "COMPLETED"
            ? "success"
            : task.status === "IN_PROGRESS"
              ? "info"
              : "neutral"
        }
      >
        {task.status.replace("_", " ")}
      </Badge>
    </button>
  );
}

function documentSummary(task: TodoTask) {
  const required = task.requiredDocuments ?? [];
  const files = task.files ?? [];
  if (required.length === 0 && files.length === 0) return null;

  const uploaded = new Set(files.map((file) => file.documentName.trim().toLowerCase()));
  const completed = required.filter((name) => uploaded.has(name.trim().toLowerCase())).length;
  const waiting = required.length > 0 && completed < required.length;

  return {
    requiredCount: required.length,
    completed,
    fileCount: files.length,
    waiting,
    label: required.length
      ? `${completed}/${required.length} required document${required.length === 1 ? "" : "s"}`
      : `${files.length} document${files.length === 1 ? "" : "s"} uploaded`,
  };
}

function DocumentBadge({ task, compact = false }: { task: TodoTask; compact?: boolean }) {
  const docs = documentSummary(task);
  if (!docs) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        docs.waiting ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
      }`}
      title={docs.label}
    >
      <FileText className="h-3 w-3" />
      {compact
        ? docs.requiredCount
          ? `${docs.completed}/${docs.requiredCount} docs`
          : `${docs.fileCount} docs`
        : docs.waiting
          ? `Awaiting upload · ${docs.completed}/${docs.requiredCount}`
          : docs.label}
    </span>
  );
}

function TaskCard({
  task,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  task: TodoTask;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";

  return (
    <button
      type="button"
      draggable
      onClick={onOpen}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-violet-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-medium text-sm text-gray-900 line-clamp-2">{task.title}</span>
        <Badge variant={PRIORITY_VARIANT[task.priority] ?? "neutral"}>{task.priority}</Badge>
      </div>
      <p className="text-xs text-gray-500 mb-2 line-clamp-1">
        {task.instance.type} · {fullName(task.instance.employee.firstName, task.instance.employee.lastName)}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        {task.assignee ? (
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {fullName(task.assignee.firstName, task.assignee.lastName)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">Anyone</span>
        )}
        {task.dueDate && (
          <span className={`inline-flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
            <Calendar className="w-3 h-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
        {(task._count?.comments ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {task._count?.comments}
          </span>
        )}
        <DocumentBadge task={task} />
      </div>
    </button>
  );
}
