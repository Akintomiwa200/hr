"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  assignee: { firstName: string; lastName: string } | null;
};

type InstanceDetail = {
  id: string;
  type: string;
  status: string;
  progress: { completed: number; total: number; percent: number };
  employee: { firstName: string; lastName: string; hireDate: string };
  tasks: TaskRow[];
};

export function ChecklistInstanceDetailModule({
  instance: initial,
  canManage,
  backHref,
}: {
  instance: InstanceDetail;
  canManage: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const [taskOpen, setTaskOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = () => router.refresh();
    return () => es.close();
  }, [router]);

  const completeTask = async (taskId: string) => {
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
    router.refresh();
  };

  const addTask = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checklist/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: initial.id, ...form }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to add task"));
        return;
      }
      notify.success("Task added");
      setTaskOpen(false);
      router.refresh();
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
              {fullName(initial.employee.firstName, initial.employee.lastName)}
            </h2>
            <p className="text-sm text-gray-500">Joined {formatDate(initial.employee.hireDate)}</p>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm text-gray-600 mb-1">
              {initial.progress.percent}% ({initial.progress.completed}/{initial.progress.total} completed)
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${initial.progress.percent}%` }} />
            </div>
          </div>
          <Badge variant={initial.status === "COMPLETED" ? "success" : "warning"}>{initial.status}</Badge>
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
            {initial.tasks.map((task) => (
              <tr key={task.id}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    {task.status === "COMPLETED" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={task.status === "COMPLETED" ? "text-gray-400 line-through" : "text-gray-900"}>
                      {task.title}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-500">{task.dueDate ? formatDate(task.dueDate) : "—"}</td>
                <td className="px-5 py-4 text-gray-600">
                  {task.assignee ? fullName(task.assignee.firstName, task.assignee.lastName) : "—"}
                </td>
                <td className="px-5 py-4">
                  {task.status !== "COMPLETED" && (
                    <Button size="sm" variant="secondary" onClick={() => completeTask(task.id)}>
                      Complete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} title="New Task">
        <div className="space-y-4">
          <input className="w-full px-4 py-3 border rounded-xl text-sm" placeholder="Task name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="w-full px-4 py-3 border rounded-xl text-sm" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input type="date" className="w-full px-4 py-3 border rounded-xl text-sm" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={addTask}>Create</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
