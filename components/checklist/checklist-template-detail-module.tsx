"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";

type TemplateTask = {
  id: string;
  title: string;
  description: string | null;
  assigneeType: string;
  taskType?: string;
  dueDaysOffset: number | null;
  sortOrder: number;
  requiredDocuments?: unknown;
};

type TemplateDetail = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isActive: boolean;
  tasks: TemplateTask[];
};

const ASSIGNEE_OPTIONS = [
  { value: "ANYONE", label: "Anyone (unassigned)" },
  { value: "EMPLOYEE", label: "New hire / employee" },
  { value: "LINE_MANAGER", label: "Line manager" },
  { value: "HR", label: "HR" },
  { value: "SPECIFIC", label: "Specific person" },
];

export function ChecklistTemplateDetailModule({
  templateId,
  canManage,
}: {
  templateId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskOpen, setTaskOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [meta, setMeta] = useState({ name: "", description: "" });
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeType: "ANYONE",
    dueDaysOffset: "3",
    requiredDocuments: "",
  });

  const load = useCallback(async () => {
    const res = await fetch(`/api/checklist/templates/${templateId}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setTemplate(data);
      setMeta({ name: data.name, description: data.description ?? "" });
    }
    setLoading(false);
  }, [templateId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useAppEvents({
    types: ["checklist_updated"],
    onEvent: () => {
      void load();
    },
  });

  const saveMeta = async () => {
    if (!meta.name.trim()) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/checklist/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: meta.name,
          description: meta.description,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save template"));
        return;
      }
      notify.success("Template details saved");
      await load();
      router.refresh();
    } finally {
      setSavingMeta(false);
    }
  };

  const setDefault = async () => {
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/checklist/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to set as active"));
        return;
      }
      notify.success("This template is now used for new workflows");
      await load();
      router.refresh();
    } finally {
      setSavingMeta(false);
    }
  };

  const addTask = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/checklist/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_task",
          title: form.title,
          description: form.description,
          assigneeType: form.assigneeType,
          dueDaysOffset: form.dueDaysOffset === "" ? null : Number(form.dueDaysOffset),
          sortOrder: template?.tasks.length ?? 0,
          requiredDocuments: form.requiredDocuments,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to add task"));
        return;
      }
      notify.success("Task added — it will apply to future onboarding/offboarding");
      setTaskOpen(false);
      setForm({
        title: "",
        description: "",
        assigneeType: "ANYONE",
        dueDaysOffset: "3",
        requiredDocuments: "",
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeTask = async (taskId: string) => {
    const res = await fetch(`/api/checklist/templates/${templateId}?taskId=${taskId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to delete task"));
      return;
    }
    notify.success("Task removed");
    await load();
  };

  if (loading && !template) {
    return <Card className="p-8 text-center text-gray-500">Loading template…</Card>;
  }

  if (!template) {
    return <Card className="p-8 text-center text-gray-500">Template not found</Card>;
  }

  const workflow =
    template.type === "ONBOARDING"
      ? { label: "Onboarding (add people)", href: "/checklist/onboarding" }
      : { label: "Offboarding (remove people)", href: "/checklist/offboarding" };

  return (
    <>
      <Link
        href="/checklist/settings"
        className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to templates
      </Link>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              Settings for {workflow.label}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{template.type}</Badge>
              <Badge variant={template.isActive ? "success" : "neutral"}>
                {template.isActive ? "Active — used for new workflows" : "Inactive"}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={workflow.href}>
              <Button size="sm" variant="secondary">
                Open {template.type === "ONBOARDING" ? "Onboarding" : "Offboarding"}
              </Button>
            </Link>
            {canManage && !template.isActive && (
              <Button size="sm" loading={savingMeta} onClick={setDefault}>
                Set as active
              </Button>
            )}
          </div>
        </div>

        {canManage ? (
          <div className="space-y-3">
            <input
              className="w-full px-4 py-3 border rounded-xl text-sm font-semibold"
              value={meta.name}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })}
              placeholder="Template name"
            />
            <textarea
              className="w-full px-4 py-3 border rounded-xl text-sm"
              rows={2}
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              placeholder="Description"
            />
            <Button size="sm" loading={savingMeta} onClick={saveMeta} disabled={!meta.name.trim()}>
              Save details
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {template.description || "No description"}
            </p>
          </>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Checklist tasks</h3>
          <p className="text-[13px] text-gray-500">
            These tasks are copied when someone is{" "}
            {template.type === "ONBOARDING" ? "added" : "removed"}.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setTaskOpen(true)}>
            <Plus className="w-4 h-4" />
            Add task
          </Button>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase text-gray-400">
              <th className="px-5 py-3">Task</th>
              <th className="px-5 py-3">Assignee</th>
              <th className="px-5 py-3">Due (days from start)</th>
              {canManage && <th className="px-5 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {template.tasks.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-5 py-8 text-center text-gray-500">
                  No tasks yet — add the steps for this workflow.
                </td>
              </tr>
            ) : (
              template.tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                    )}
                    {Array.isArray(task.requiredDocuments) && task.requiredDocuments.length > 0 && (
                      <p className="text-[11px] text-brand-600 mt-1">
                        Documents: {task.requiredDocuments.join(", ")}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {ASSIGNEE_OPTIONS.find((o) => o.value === task.assigneeType)?.label ??
                      task.assigneeType}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {task.dueDaysOffset == null ? "—" : task.dueDaysOffset}
                  </td>
                  {canManage && (
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} title="Add template task">
        <div className="space-y-4">
          <input
            className="w-full px-4 py-3 border rounded-xl text-sm"
            placeholder="Task title"
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
            value={form.assigneeType}
            onChange={(e) => setForm({ ...form, assigneeType: e.target.value })}
          >
            {ASSIGNEE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="w-full px-4 py-3 border rounded-xl text-sm"
            placeholder="Due days from start (negative = before start)"
            value={form.dueDaysOffset}
            onChange={(e) => setForm({ ...form, dueDaysOffset: e.target.value })}
          />
          <textarea
            className="w-full px-4 py-3 border rounded-xl text-sm"
            rows={3}
            placeholder="Required documents (optional, one per line)"
            value={form.requiredDocuments}
            onChange={(e) => setForm({ ...form, requiredDocuments: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTaskOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={addTask} disabled={!form.title.trim()}>
              Add task
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
