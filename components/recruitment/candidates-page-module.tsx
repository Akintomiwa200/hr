"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Avatar, Button } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { CandidateDrawer, type CandidateRecord } from "@/components/recruitment/candidate-drawer";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { stageBadgeClass } from "@/lib/recruitment/constants";

type Job = { id: string; title: string };
type Source = { id: string; name: string };
type Tag = { id: string; name: string };
type EmailTemplate = { id: string; name: string; subject: string; body: string; stage: string | null };

const inputClass =
  "px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export function CandidatesPageModule({
  applications,
  jobs,
  stages,
  sources,
  tags,
  emailTemplates,
  canManage,
}: {
  applications: CandidateRecord[];
  jobs: Job[];
  stages: string[];
  sources: Source[];
  tags: Tag[];
  emailTemplates: EmailTemplate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [jobFilter, setJobFilter] = useState("ALL");
  const [selected, setSelected] = useState<CandidateRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    jobId: jobs[0]?.id ?? "",
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
    return applications.filter((app) => {
      if (jobFilter !== "ALL" && app.job.id !== jobFilter) return false;
      if (statusFilter !== "ALL" && app.pipelineStage !== statusFilter) return false;
      if (!q) return true;
      return (
        app.firstName.toLowerCase().includes(q) ||
        app.lastName.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.job.title.toLowerCase().includes(q)
      );
    });
  }, [applications, search, statusFilter, jobFilter]);

  const addCandidate = async () => {
    if (!form.jobId || !form.firstName || !form.lastName || !form.email) {
      return notify.error("Job, name and email are required");
    }
    setLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to add candidate"));
        return;
      }
      notify.success("Candidate added");
      setAddOpen(false);
      router.refresh();
    } catch {
      notify.error("Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("Remove this candidate?")) return;
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to delete"));
      return;
    }
    notify.success("Candidate removed");
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          <select className={inputClass} value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
            <option value="ALL">All jobs</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All stages</option>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className={`${inputClass} w-full pl-9`} placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canManage && <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Candidates</Button>}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Job</th>
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
                  <td className="px-4 py-3 text-gray-600">{app.job.title}</td>
                  <td className="px-4 py-3">{app.resumeUrl ? <FileText className="w-4 h-4 text-brand-600" /> : "—"}</td>
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
          Showing {filtered.length} of {applications.length} candidates
        </div>
      </div>

      <CandidateDrawer
        candidate={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        stages={stages}
        emailTemplates={emailTemplates}
        canManage={canManage}
      />

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="New Candidate" width="md">
        <div className="p-6 space-y-4">
          <select className={`${inputClass} w-full`} value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })}>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="First name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input className={inputClass} placeholder="Last name *" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <input className={`${inputClass} w-full`} type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={`${inputClass} w-full`} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className={`${inputClass} w-full`} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
            <option value="">Source</option>
            {sources.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select className={`${inputClass} w-full`} value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })}>
            <option value="">Tag</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className={`${inputClass} w-full`} placeholder="Resume URL" value={form.resumeUrl} onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })} />
          <textarea className={`${inputClass} w-full`} rows={3} placeholder="Description" value={form.coverLetter} onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={() => void addCandidate()}>Create</Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
