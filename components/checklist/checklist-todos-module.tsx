"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Filter,
  LayoutGrid,
  List,
  MessageSquare,
  Plus,
  Search,
  User,
} from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
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
  { key: "PENDING", label: "To Do", color: "border-gray-200 bg-gray-50/50" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-blue-200 bg-blue-50/30" },
  { key: "COMPLETED", label: "Done", color: "border-emerald-200 bg-emerald-50/30" },
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
  const [view, setView] = useState<"board" | "list">("board");
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
  });

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    q.set("status", filters.status);
    if (filters.priority !== "ALL") q.set("priority", filters.priority);
    if (filters.type !== "ALL") q.set("type", filters.type);
    if (filters.assigneeId !== "ALL") q.set("assigneeId", filters.assigneeId);
    if (filters.search.trim()) q.set("search", filters.search.trim());
    return q.toString();
  }, [filters]);

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
    void load();
  }, [load]);

  useAppEvents({
    types: ["checklist_updated", "dashboard_updated"],
    pollIntervalMs: 2000,
    onEvent: () => {
      void load({ silent: true });
      router.refresh();
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
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create task"));
        return;
      }
      notify.success("Task created");
      setCreateOpen(false);
      setForm((f) => ({ ...f, title: "", description: "", dueDate: "" }));
      load();
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (taskId: string, status: string) => {
    const res = await fetch(`/api/checklist/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to update task"));
      return;
    }
    load();
  };

  const activeCount = tasks.filter((t) => t.status !== "COMPLETED").length;

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
            onClick={() => setView("board")}
            className={`px-3 py-2 text-sm ${view === "board" ? "bg-violet-50 text-violet-700" : "bg-white text-gray-600"}`}
            aria-label="Board view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-3 py-2 text-sm border-l border-gray-200 ${view === "list" ? "bg-violet-50 text-violet-700" : "bg-white text-gray-600"}`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
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
            return (
              <div key={col.key} className={`rounded-xl border p-3 min-h-[320px] ${col.color}`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="text-xs text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onOpen={() => setSelected(task)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
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
                    {task.status !== "COMPLETED" && (
                      <div className="flex gap-1">
                        {task.status === "PENDING" && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(task.id, "IN_PROGRESS")}>
                            Start
                          </Button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(task.id, "COMPLETED")}>
                            Done
                          </Button>
                        )}
                      </div>
                    )}
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Create Task">
        <div className="space-y-4">
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
                <option value="">Unassigned</option>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={creating} onClick={createTask} disabled={!form.title.trim()}>
              Create Task
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function TaskCard({ task, onOpen }: { task: TodoTask; onOpen: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:border-violet-300 hover:shadow transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-medium text-sm text-gray-900 line-clamp-2">{task.title}</span>
        <Badge variant={PRIORITY_VARIANT[task.priority] ?? "neutral"}>{task.priority}</Badge>
      </div>
      <p className="text-xs text-gray-500 mb-2 line-clamp-1">
        {task.instance.type} · {fullName(task.instance.employee.firstName, task.instance.employee.lastName)}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        {task.assignee && (
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {fullName(task.assignee.firstName, task.assignee.lastName)}
          </span>
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
      </div>
    </button>
  );
}
