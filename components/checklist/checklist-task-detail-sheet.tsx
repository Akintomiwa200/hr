"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge, Button, Input, Select, Textarea } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { parseDocumentNames } from "@/lib/checklist/documents";
import { ChecklistTaskDocumentsPanel, type TaskFile } from "./checklist-task-documents-panel";

type Comment = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  taskType?: string;
  requiredDocuments?: unknown;
  files?: TaskFile[];
  assignee: { id: string; firstName: string; lastName: string } | null;
  instance: {
    id: string;
    type: string;
    employee: { firstName: string; lastName: string };
  };
  comments: Comment[];
};

type EmployeeOption = { id: string; firstName: string; lastName: string };

const PRIORITY_VARIANT: Record<string, "neutral" | "info" | "warning" | "error"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "error",
};

export function ChecklistTaskDetailSheet({
  taskId,
  canManage,
  employees,
  onClose,
  onUpdated,
}: {
  taskId: string | null;
  canManage: boolean;
  employees: EmployeeOption[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }
    setLoading(true);
    fetch(`/api/checklist/tasks/${taskId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setTask)
      .finally(() => setLoading(false));
  }, [taskId]);

  const patch = async (data: Record<string, unknown>) => {
    if (!taskId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/checklist/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update task"));
        return;
      }
      const updated = await res.json();
      setTask((prev) => (prev ? { ...prev, ...updated, comments: prev.comments } : prev));
      onUpdated();
      notify.success("Task updated");
    } finally {
      setSaving(false);
    }
  };

  const postComment = async () => {
    if (!taskId || !comment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/checklist/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to add comment"));
        return;
      }
      const newComment = await res.json();
      setTask((prev) => (prev ? { ...prev, comments: [...prev.comments, newComment] } : prev));
      setComment("");
      onUpdated();
    } finally {
      setPosting(false);
    }
  };

  const deleteTask = async () => {
    if (!taskId || !confirm("Delete this task?")) return;
    const res = await fetch(`/api/checklist/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to delete task"));
      return;
    }
    notify.success("Task deleted");
    onClose();
    onUpdated();
  };

  return (
    <Sheet
      open={!!taskId}
      onClose={onClose}
      title={task?.title ?? "Task"}
      width="lg"
      description={
        task
          ? `${task.instance.type} for ${fullName(task.instance.employee.firstName, task.instance.employee.lastName)}`
          : undefined
      }
    >
      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading task…</p>
      ) : !task ? (
        <p className="text-sm text-gray-500 py-8 text-center">Task not found</p>
      ) : (
        <div className="p-6 space-y-8">
          <div className="flex flex-wrap gap-2">
            <Badge variant={task.status === "COMPLETED" ? "success" : task.status === "IN_PROGRESS" ? "info" : "neutral"}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge variant={PRIORITY_VARIANT[task.priority] ?? "neutral"}>{task.priority}</Badge>
          </div>

          <section className="space-y-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</h3>
            {canManage ? (
              <div className="space-y-4">
                <Input
                  label="Title"
                  defaultValue={task.title}
                  onBlur={(e) => e.target.value !== task.title && patch({ title: e.target.value })}
                />
                <Textarea
                  label="Description"
                  defaultValue={task.description ?? ""}
                  rows={4}
                  placeholder="Add a description for this task…"
                  onBlur={(e) =>
                    e.target.value !== (task.description ?? "") && patch({ description: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Status"
                    value={task.status}
                    onChange={(e) => patch({ status: e.target.value })}
                    disabled={saving}
                  >
                    <option value="PENDING">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Done</option>
                  </Select>
                  <Select
                    label="Priority"
                    value={task.priority}
                    onChange={(e) => patch({ priority: e.target.value })}
                    disabled={saving}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Assignee"
                    value={task.assignee?.id ?? ""}
                    onChange={(e) => patch({ assigneeId: e.target.value || null })}
                    disabled={saving}
                  >
                    <option value="">Anyone / unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {fullName(emp.firstName, emp.lastName)}
                      </option>
                    ))}
                  </Select>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Due date</label>
                    <input
                      type="date"
                      defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                      onBlur={(e) => {
                        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                        const cur = task.dueDate ? task.dueDate.slice(0, 10) : "";
                        if (e.target.value !== cur) patch({ dueDate: val });
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-gray-600">{task.description || "No description"}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-medium text-gray-900 mt-0.5">{task.status.replace("_", " ")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Due</p>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {task.dueDate ? formatDate(task.dueDate) : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Assignee</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {task.assignee ? fullName(task.assignee.firstName, task.assignee.lastName) : "Anyone"}
                  </p>
                </div>
              </div>
            )}
          </section>

          {canManage && task.status !== "COMPLETED" && (
            <section className="pt-6 border-t border-gray-100">
              <Button loading={saving} onClick={() => patch({ action: "complete" })} className="w-full">
                Complete task
              </Button>
            </section>
          )}

          <section className="pt-5 border-t border-gray-100">
            <ChecklistTaskDocumentsPanel
              taskId={task.id}
              requiredDocuments={task.requiredDocuments}
              files={task.files ?? []}
              canManage={canManage}
              canUpload
              onChanged={() => {
                fetch(`/api/checklist/tasks/${task.id}`)
                  .then((res) => (res.ok ? res.json() : null))
                  .then((next) => next && setTask(next));
                onUpdated();
              }}
            />
          </section>

          <section className="space-y-4 pt-5 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity & Comments</h4>
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {task.comments.length === 0 ? (
                  <p className="text-sm text-gray-400">No comments yet</p>
                ) : (
                  task.comments.map((c) => (
                    <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{c.authorName}</span>
                        <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && postComment()}
                />
                <Button loading={posting} onClick={postComment} disabled={!comment.trim()}>
                  Post
                </Button>
              </div>
            </div>
          </section>

          {canManage && task.status !== "COMPLETED" && (
            <div className="pt-5 border-t border-gray-100">
              <Button variant="danger" size="sm" onClick={deleteTask}>
                <Trash2 className="w-4 h-4" />
                Delete Task
              </Button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
