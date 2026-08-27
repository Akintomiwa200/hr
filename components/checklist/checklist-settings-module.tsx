"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, Plus, Settings2, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";

type Template = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isActive: boolean;
  _count: { tasks: number; instances?: number };
  tasks?: { id: string; title: string }[];
};

export function ChecklistSettingsModule({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"ONBOARDING" | "OFFBOARDING">("ONBOARDING");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/checklist/templates?type=${tab}`, { cache: "no-store" });
    if (res.ok) setTemplates(await res.json());
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useAppEvents({
    types: ["checklist_updated"],
    onEvent: () => {
      void load();
    },
  });

  const create = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checklist/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, ...form, withStarterTasks: true }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create template"));
        return;
      }
      const created = await res.json();
      notify.success("Template created and set as active");
      setCreateOpen(false);
      setForm({ name: "", description: "" });
      await load();
      if (created?.id) router.push(`/checklist/settings/${created.id}`);
    } finally {
      setLoading(false);
    }
  };

  const setDefault = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/checklist/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to set default template"));
        return;
      }
      notify.success(
        tab === "ONBOARDING"
          ? "This template will be used when adding people"
          : "This template will be used when removing people"
      );
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/checklist/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete template"));
        return;
      }
      notify.success("Template deleted");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const active = templates.find((t) => t.isActive);
  const workflowLabel = tab === "ONBOARDING" ? "add someone" : "remove someone";
  const workflowHref = tab === "ONBOARDING" ? "/checklist/onboarding" : "/checklist/offboarding";

  return (
    <>
      <Card className="p-5 mb-6 bg-brand-50/40 border-brand-100">
        <div className="flex flex-wrap items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-brand-600 flex items-center justify-center border border-brand-100">
            <Settings2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h2 className="text-[15px] font-semibold text-gray-900">
              Checklist settings for onboarding &amp; offboarding
            </h2>
            <p className="text-[13px] text-gray-600 mt-1">
              These templates define the tasks that run automatically when you{" "}
              <Link href="/checklist/onboarding" className="text-brand-600 font-medium hover:underline">
                add people
              </Link>{" "}
              or{" "}
              <Link href="/checklist/offboarding" className="text-brand-600 font-medium hover:underline">
                remove people
              </Link>
              . Mark one template as <strong>Active</strong> for each workflow.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 mb-6">
        {(["ONBOARDING", "OFFBOARDING"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              tab === t ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t === "ONBOARDING" ? "Onboarding settings" : "Offboarding settings"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-[13px] text-gray-500">
          {active ? (
            <>
              Active for {workflowLabel}:{" "}
              <span className="font-semibold text-gray-800">{active.name}</span> (
              {active._count.tasks} tasks)
            </>
          ) : (
            <>No active template — create one or set an existing template as active.</>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={workflowHref}>
            <Button variant="secondary" size="sm">
              Open {tab === "ONBOARDING" ? "Onboarding" : "Offboarding"}
            </Button>
          </Link>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setForm({
                  name: tab === "ONBOARDING" ? "Onboarding checklist" : "Offboarding checklist",
                  description:
                    tab === "ONBOARDING"
                      ? "Tasks for new hires joining the company"
                      : "Tasks when someone leaves the company",
                });
                setCreateOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              New template
            </Button>
          )}
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title={`No ${tab.toLowerCase()} templates`}
            description={`Create a template with the tasks that should run when you ${workflowLabel}.`}
            action={
              canManage ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create template
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id} className={`p-5 ${tpl.isActive ? "ring-2 ring-brand-200" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Link
                      href={`/checklist/settings/${tpl.id}`}
                      className="font-semibold text-gray-900 hover:text-brand-600 truncate"
                    >
                      {tpl.name}
                    </Link>
                    {tpl.isActive ? (
                      <Badge variant="success">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{tpl.description || "No description"}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {tpl._count.tasks} tasks
                    {tpl._count.instances != null ? ` · used ${tpl._count.instances} time(s)` : ""}
                  </p>
                  {tpl.tasks && tpl.tasks.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {tpl.tasks.slice(0, 3).map((task) => (
                        <li key={task.id} className="text-xs text-gray-500 truncate">
                          • {task.title}
                        </li>
                      ))}
                      {tpl._count.tasks > 3 && (
                        <li className="text-xs text-gray-400">+{tpl._count.tasks - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => remove(tpl.id)}
                    disabled={busyId === tpl.id}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link href={`/checklist/settings/${tpl.id}`}>
                  <Button size="sm" variant="secondary">
                    Edit tasks
                  </Button>
                </Link>
                {canManage && !tpl.isActive && (
                  <Button
                    size="sm"
                    loading={busyId === tpl.id}
                    onClick={() => setDefault(tpl.id)}
                  >
                    Use when I {workflowLabel}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`New ${tab === "ONBOARDING" ? "onboarding" : "offboarding"} template`}
        description="Starter tasks are added automatically — you can edit them next."
      >
        <div className="space-y-4">
          <input
            className="w-full px-4 py-3 border rounded-xl text-sm"
            placeholder="Template name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <textarea
            className="w-full px-4 py-3 border rounded-xl text-sm"
            rows={3}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={loading} onClick={create} disabled={!form.name.trim()}>
              Create &amp; edit tasks
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
