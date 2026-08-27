"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, FileText, Plus } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { parseDocumentNames } from "@/lib/checklist/documents";
import { ChecklistTaskDetailSheet } from "./checklist-task-detail-sheet";

type EmployeeOption = { id: string; firstName: string; lastName: string };

type TaskFile = { id: string; documentName: string };

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  taskType?: string;
  dueDate: string | null;
  assignee: { id?: string; firstName: string; lastName: string } | null;
  requiredDocuments?: unknown;
  files?: TaskFile[];
};

type InstanceDetail = {
  id: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string | null;
  progress: { completed: number; total: number; percent: number };
  employee: {
    firstName: string;
    lastName: string;
    hireDate: string;
    endDate?: string | null;
  };
  tasks: TaskRow[];
};

function toIso(value: string | Date | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : new Date(value).toISOString();
}

export function ChecklistInstanceDetailModule({
  instance: initial,
  canManage,
  backHref,
}: {
  instance: InstanceDetail;
  canManage: boolean;
  backHref: string;
}) {
  const [instance, setInstance] = useState(initial);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    assigneeId: "",
    requiredDocuments: "",
  });
  const [loading, setLoading] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    setInstance(initial);
  }, [initial]);

  useEffect(() => {
    void fetch("/api/employees?status=ACTIVE")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: EmployeeOption[]) => setEmployees(Array.isArray(rows) ? rows : []));
  }, []);

  const refreshFromApi = useCallback(async () => {
    const res = await fetch(`/api/checklist/instances/${instance.id}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    const completed = (data.tasks ?? []).filter((t: TaskRow) => t.status === "COMPLETED").length;
    const total = (data.tasks ?? []).length;
    setInstance({
      id: data.id,
      type: data.type,
      status: data.status,
      startDate: toIso(data.startDate) ?? undefined,
      endDate: toIso(data.endDate),
      progress: {
        completed,
        total,
        percent: total ? Math.round((completed / total) * 100) : 0,
      },
      employee: {
        firstName: data.employee.firstName,
        lastName: data.employee.lastName,
        hireDate: toIso(data.employee.hireDate) ?? new Date().toISOString(),
        endDate: toIso(data.employee.endDate),
      },
      tasks: (data.tasks ?? []).map((t: TaskRow) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        taskType: t.taskType,
        dueDate: t.dueDate ?? null,
        assignee: t.assignee,
        requiredDocuments: t.requiredDocuments,
        files: t.files,
      })),
    });
  }, [instance.id]);

  useAppEvents({
    types: ["checklist_updated"],
    onEvent: () => {
      void refreshFromApi();
    },
  });

  const completeTask = async (taskId: string) => {
    setCompletingId(taskId);
    try {
      const res = await fetch(`/api/checklist/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to complete task"));
        return;
      }
      notify.success("Task completed");
      await refreshFromApi();
    } finally {
      setCompletingId(null);
    }
  };

  const assignTask = async (taskId: string, assigneeId: string) => {
    setAssigningId(taskId);
    try {
      const res = await fetch(`/api/checklist/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: assigneeId || null }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to assign task"));
        return;
      }
      await refreshFromApi();
    } finally {
      setAssigningId(null);
    }
  };

  const addTask = async () => {
    setLoading(true);
    try {
      const requiredDocuments = parseDocumentNames(form.requiredDocuments);
      const res = await fetch("/api/checklist/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: instance.id,
          title: form.title,
          description: form.description,
          dueDate: form.dueDate || undefined,
          assigneeId: form.assigneeId || undefined,
          requiredDocuments,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to add task"));
        return;
      }
      notify.success("Task added");
      setTaskOpen(false);
      setForm({ title: "", description: "", dueDate: "", assigneeId: "", requiredDocuments: "" });
      await refreshFromApi();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Link href={backHref} className="text-sm text-brand-600 hover:underline mb-4 inline-block">
        ← Back to list
      </Link>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {fullName(instance.employee.firstName, instance.employee.lastName)}
            </h2>
            <p className="text-sm text-gray-500">
              {instance.type === "OFFBOARDING"
                ? `Last day ${formatDate(instance.endDate || instance.employee.endDate || instance.startDate || instance.employee.hireDate)}`
                : `Start date ${formatDate(instance.startDate || instance.employee.hireDate)}`}
            </p>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm text-gray-600 mb-1">
              {instance.progress.percent}% ({instance.progress.completed}/{instance.progress.total}{" "}
              completed)
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${instance.progress.percent}%` }}
              />
            </div>
          </div>
          <Badge variant={instance.status === "COMPLETED" ? "success" : "warning"}>
            {instance.status}
          </Badge>
        </div>
      </Card>

      {canManage && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setTaskOpen(true)}>
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase text-gray-400">
              <th className="px-5 py-3">Task</th>
              <th className="px-5 py-3">Due Date</th>
              <th className="px-5 py-3">Assignee</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {instance.tasks.map((task) => {
              const required = parseDocumentNames(task.requiredDocuments);
              const isDocumentTask = task.taskType === "DOCUMENT" || required.length > 0;
              const uploaded = new Set(
                (task.files ?? []).map((file) => file.documentName.trim().toLowerCase())
              );
              const docsDone = required.filter((name) => uploaded.has(name.toLowerCase())).length;
              return (
                <tr key={task.id}>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      className="flex items-start gap-2 text-left"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      {task.status === "COMPLETED" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                      )}
                      <span>
                        <span
                          className={
                            task.status === "COMPLETED"
                              ? "text-gray-400 line-through"
                              : "text-gray-900 font-medium"
                          }
                        >
                          {task.title}
                        </span>
                        {isDocumentTask && (
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                            <FileText className="w-3 h-3" />
                            {docsDone}/{required.length || (task.files?.length ?? 0)} documents
                          </span>
                        )}
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {task.dueDate ? formatDate(task.dueDate) : "—"}
                  </td>
                  <td className="px-5 py-4">
                    {canManage ? (
                      <select
                        value={task.assignee?.id ?? ""}
                        disabled={assigningId === task.id}
                        onChange={(e) => void assignTask(task.id, e.target.value)}
                        className="max-w-[180px] border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                      >
                        <option value="">Anyone / unassigned</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {fullName(emp.firstName, emp.lastName)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-600">
                        {task.assignee
                          ? fullName(task.assignee.firstName, task.assignee.lastName)
                          : "Anyone"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {isDocumentTask && (
                        <Link
                          href={`/checklist/tasks/${task.id}`}
                          className="text-[13px] font-medium text-brand-600 hover:underline"
                        >
                          Documents
                        </Link>
                      )}
                      {task.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={completingId === task.id}
                          onClick={() => completeTask(task.id)}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <ChecklistTaskDetailSheet
        taskId={selectedTaskId}
        canManage={canManage}
        employees={employees}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={() => void refreshFromApi()}
      />

      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} title="New Task">
        <div className="space-y-4">
          <input
            className="w-full px-4 py-3 border rounded-xl text-sm"
            placeholder="Task name"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="w-full px-4 py-3 border rounded-xl text-sm"
            rows={3}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="w-full px-4 py-3 border rounded-xl text-sm"
            value={form.assigneeId}
            onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          >
            <option value="">Assign later — anyone can complete</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {fullName(emp.firstName, emp.lastName)}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="w-full px-4 py-3 border rounded-xl text-sm"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Required documents (optional, one per line)
            </label>
            <textarea
              className="w-full px-4 py-3 border rounded-xl text-sm"
              rows={3}
              placeholder={"National ID\nSigned contract"}
              value={form.requiredDocuments}
              onChange={(e) => setForm({ ...form, requiredDocuments: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTaskOpen(false)}>
              Cancel
            </Button>
            <Button loading={loading} onClick={addTask} disabled={!form.title.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
