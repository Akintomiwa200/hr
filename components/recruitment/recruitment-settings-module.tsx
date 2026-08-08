"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { notify, readApiError } from "@/lib/toast";
import { stageBadgeClass } from "@/lib/recruitment/constants";

type Stage = { id: string; name: string; sortOrder: number; color: string };
type Tag = { id: string; name: string; color: string; _count?: { applications: number } };
type Source = { id: string; name: string };
type Template = { id: string; name: string; subject: string; body: string; stage: string | null; updatedAt: string };

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20";

const settingsTabs = [
  { id: "workflow", label: "Hiring Workflow" },
  { id: "tags", label: "Tag & Resource" },
  { id: "templates", label: "Email Template" },
] as const;

export function RecruitmentSettingsModule({
  stages: initialStages,
  tags: initialTags,
  sources: initialSources,
  templates: initialTemplates,
}: {
  stages: Stage[];
  tags: Tag[];
  sources: Source[];
  templates: Template[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof settingsTabs)[number]["id"]>("workflow");
  const [tagSubTab, setTagSubTab] = useState<"tag" | "resource">("tag");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newStage, setNewStage] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newSource, setNewSource] = useState("");
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", body: "", stage: "Applied" });

  const create = async (type: string, payload: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/recruitment/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save"));
        return;
      }
      notify.success("Saved");
      router.refresh();
    } catch {
      notify.error("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (type: string, id: string) => {
    const res = await fetch(`/api/recruitment/settings?type=${type}&id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to delete"));
      return;
    }
    notify.success("Deleted");
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
      <div className="bg-white border border-gray-100 rounded-2xl p-3 h-fit">
        {settingsTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${tab === t.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {tab === "workflow" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Setting Recruitment</h2>
                <p className="text-sm text-gray-500">Hiring Workflow Setting</p>
              </div>
              <div className="flex gap-2">
                <input className={inputClass} placeholder="New stage name" value={newStage} onChange={(e) => setNewStage(e.target.value)} />
                <Button onClick={() => { if (newStage) void create("stage", { name: newStage, sortOrder: initialStages.length }); setNewStage(""); }}>
                  <Plus className="w-4 h-4" /> New Stage
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {initialStages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <GripVertical className="w-4 h-4 text-gray-300" />
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stageBadgeClass(stage.name)}`}>{stage.name}</span>
                  <button type="button" onClick={() => void remove("stage", stage.id)} className="ml-auto text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "tags" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Setting Recruitment</h2>
                <p className="text-sm text-gray-500">Tag & Resource</p>
              </div>
              <Button onClick={() => tagSubTab === "tag" ? (newTag && void create("tag", { name: newTag }), setNewTag("")) : (newSource && void create("source", { name: newSource }), setNewSource(""))}>
                <Plus className="w-4 h-4" /> {tagSubTab === "tag" ? "New Tag" : "New Resource"}
              </Button>
            </div>
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setTagSubTab("tag")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tagSubTab === "tag" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>Tag</button>
              <button type="button" onClick={() => setTagSubTab("resource")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tagSubTab === "resource" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>Resource</button>
            </div>
            {tagSubTab === "tag" ? (
              <>
                <input className={`${inputClass} mb-4`} placeholder="Tag name" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {initialTags.map((tag) => (
                    <div key={tag.id} className="p-4 border border-gray-100 rounded-2xl">
                      <div className="flex items-start justify-between">
                        <p className="font-semibold text-gray-900">{tag.name}</p>
                        <button type="button" onClick={() => void remove("tag", tag.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">{tag._count?.applications ?? 0} Candidates</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <input className={`${inputClass} mb-4`} placeholder="Source name" value={newSource} onChange={(e) => setNewSource(e.target.value)} />
                <div className="space-y-2">
                  {initialSources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                      <span className="text-sm font-medium">{source.name}</span>
                      <button type="button" onClick={() => void remove("source", source.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "templates" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Setting Recruitment</h2>
                <p className="text-sm text-gray-500">Email templates by stage</p>
              </div>
              <Button onClick={() => setTemplateOpen(true)}><Plus className="w-4 h-4" /> Add Template</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Subject</th>
                    <th className="text-left py-2">Stage</th>
                    <th className="text-right py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {initialTemplates.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50">
                      <td className="py-3 font-medium">{t.name}</td>
                      <td className="py-3 text-gray-600">{t.subject}</td>
                      <td className="py-3"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stageBadgeClass(t.stage ?? "Applied")}`}>{t.stage ?? "—"}</span></td>
                      <td className="py-3 text-right">
                        <button type="button" onClick={() => void remove("template", t.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Sheet open={templateOpen} onClose={() => setTemplateOpen(false)} title="Detail Email Template" width="lg">
        <div className="p-6 space-y-4">
          <input className={inputClass} placeholder="Template name" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
          <select className={inputClass} value={templateForm.stage} onChange={(e) => setTemplateForm({ ...templateForm, stage: e.target.value })}>
            {initialStages.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <input className={inputClass} placeholder="Subject" value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} />
          <textarea className={`${inputClass} min-h-[220px]`} placeholder="Body — use {{candidate_first_name}}, {{job_title}}, {{company_name}}" value={templateForm.body} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTemplateOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={() => void create("template", templateForm).then(() => setTemplateOpen(false))}>Save</Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
