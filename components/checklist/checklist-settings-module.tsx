"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";

type Template = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  _count: { tasks: number };
};

export function ChecklistSettingsModule({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"ONBOARDING" | "OFFBOARDING">("ONBOARDING");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/checklist/templates?type=${tab}`);
    if (res.ok) setTemplates(await res.json());
  };

  useEffect(() => {
    load();
    const es = new EventSource("/api/events");
    es.onmessage = () => {
      load();
      router.refresh();
    };
    return () => es.close();
  }, [router, tab]);

  const create = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checklist/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, ...form }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create template"));
        return;
      }
      notify.success("Template created");
      setCreateOpen(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/checklist/templates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to delete template"));
      return;
    }
    notify.success("Template deleted");
    load();
  };

  return (
    <>
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
            {t === "ONBOARDING" ? "Onboarding Template" : "Offboarding Template"}
          </button>
        ))}
      </div>

      {canManage && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>
      )}

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No templates"
            description="Create a checklist template to reuse across employees."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/checklist/settings/${tpl.id}`} className="font-semibold text-gray-900 hover:text-brand-600">
                    {tpl.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">{tpl.description || "No description"}</p>
                  <p className="text-xs text-gray-400 mt-2">{tpl._count.tasks} tasks</p>
                </div>
                {canManage && (
                  <button type="button" onClick={() => remove(tpl.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Add New Template">
        <div className="space-y-4">
          <input className="w-full px-4 py-3 border rounded-xl text-sm" placeholder="Template name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea className="w-full px-4 py-3 border rounded-xl text-sm" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={create}>Create</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
