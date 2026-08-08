"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Columns3,
  FileText,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Avatar, Button } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { CandidateDrawer, type CandidateRecord } from "@/components/recruitment/candidate-drawer";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { parsePipelineStages, stageBadgeClass } from "@/lib/recruitment/constants";

type Source = { id: string; name: string };
type Tag = { id: string; name: string };
type EmailTemplate = { id: string; name: string; subject: string; body: string; stage: string | null };

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export function JobDetailModule({
  job,
  stages,
  sources,
  tags,
  emailTemplates,
  canManage,
}: {
  job: {
    id: string;
    title: string;
    department: { name: string };
    pipelineStages: string | null;
    applications: CandidateRecord[];
  };
  stages: string[];
  sources: Source[];
  tags: Tag[];
  emailTemplates: EmailTemplate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const pipeline = parsePipelineStages(job.pipelineStages ?? JSON.stringify(stages));
  const [view, setView] = useState<"table" | "pipeline">("table");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CandidateRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    source: "",
    tagId: "",
    resumeUrl: "",
    coverLetter: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return job.applications;
    return job.applications.filter(
      (a) =>
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
  }, [job.applications, search]);

  const byStage = useMemo(() => {
    const map = new Map<string, CandidateRecord[]>();
    for (const stage of pipeline) map.set(stage, []);
    for (const app of filtered) {
      const list = map.get(app.pipelineStage) ?? [];
      list.push(app);
      map.set(app.pipelineStage, list);
    }
    return map;
  }, [filtered, pipeline]);

  const addCandidate = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      return notify.error("Name and email are required");
    }
    setLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, ...form }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to add candidate"));
        return;
      }
      notify.success("Candidate added");
      setAddOpen(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", source: "", tagId: "", resumeUrl: "", coverLetter: "" });
      router.refresh();
    } catch {
      notify.error("Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("Remove this candidate?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete candidate"));
        return;
      }
      notify.success("Candidate removed");
      router.refresh();
    } catch {
      notify.error("Failed to delete candidate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-xs text-gray-400 mb-1">
            <Link href="/recruitment" className="hover:text-brand-600">Recruitment</Link>
            {" / "}
            <Link href="/recruitment" className="hover:text-brand-600">Job List</Link>
            {" / "}
            <span className="text-gray-600">{job.title}</span>
          </p>
          <h1 className="text-xl font-semibold text-gray-900">{job.title}</h1>
          <p className="text-sm text-gray-500">{job.department.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className={`${inputClass} pl-9`} placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button type="button" onClick={() => setView("table")} className={`p-2 rounded-md ${view === "table" ? "bg-gray-100" : ""}`}><Columns3 className="w-4 h-4" /></button>
            <button type="button" onClick={() => setView("pipeline")} className={`p-2 rounded-md ${view === "pipeline" ? "bg-gray-100" : ""}`}><LayoutGrid className="w-4 h-4" /></button>
          </div>
          {canManage && (
            <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Candidates</Button>
          )}
        </div>
      </div>

      {view === "table" ? (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CV</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelected(app)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={app.firstName} lastName={app.lastName} src={app.photoUrl} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{fullName(app.firstName, app.lastName)}</p>
                          <p className="text-xs text-gray-500">{app.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{app.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      {app.resumeUrl ? <FileText className="w-4 h-4 text-brand-600" /> : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(app.appliedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stageBadgeClass(app.pipelineStage)}`}>
                        {app.pipelineStage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setSelected(app)} className="p-2 text-gray-400 hover:text-brand-600 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        {canManage && (
                          <button type="button" onClick={() => void deleteCandidate(app.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            Showing {filtered.length} of {job.applications.length} candidates
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipeline.map((stage) => (
            <div key={stage} className="min-w-[260px] flex-1 bg-gray-50/80 rounded-2xl border border-gray-100">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{stage}</span>
                  <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5">{(byStage.get(stage) ?? []).length}</span>
                </div>
                {canManage && <button type="button" onClick={() => setAddOpen(true)} className="text-gray-400 hover:text-brand-600"><Plus className="w-4 h-4" /></button>}
              </div>
              <div className="p-3 space-y-2 min-h-[200px]">
                {(byStage.get(stage) ?? []).map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelected(app)}
                    className="w-full text-left p-3 bg-white border border-gray-100 rounded-xl hover:border-brand-200 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar firstName={app.firstName} lastName={app.lastName} src={app.photoUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{fullName(app.firstName, app.lastName)}</p>
                        <p className="text-[11px] text-gray-500 truncate">{app.email}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CandidateDrawer
        candidate={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        stages={pipeline}
        emailTemplates={emailTemplates}
        canManage={canManage}
      />

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="New Candidate" width="md">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="First name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input className={inputClass} placeholder="Last name *" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <input className={inputClass} type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className={inputClass} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
            <option value="">Source</option>
            {sources.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select className={inputClass} value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })}>
            <option value="">Tag</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className={inputClass} placeholder="Resume URL" value={form.resumeUrl} onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })} />
          <textarea className={inputClass} rows={3} placeholder="Description / cover letter" value={form.coverLetter} onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={() => void addCandidate()}>Create</Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
