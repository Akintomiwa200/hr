"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, MapPin, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Badge, Button, Card, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";

type Department = { id: string; name: string };
type Job = {
  id: string;
  title: string;
  location: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  requirements: string;
  responsibilities?: string | null;
  benefits?: string | null;
  status: string;
  postedAt: Date | string;
  department: Department;
  applications: { id: string }[];
};

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

const emptyJob = (departmentId: string) => ({
  title: "",
  departmentId,
  location: "",
  type: "Full-time",
  salaryMin: "",
  salaryMax: "",
  description: "",
  requirements: "",
  responsibilities: "",
  benefits: "",
  status: "OPEN",
});

export function RecruitmentModule({
  jobs: initial,
  departments,
  canManage,
}: {
  jobs: Job[];
  departments: Department[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { currency } = useCurrency();
  const [createOpen, setCreateOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [deleteJob, setDeleteJob] = useState<Job | null>(null);
  const [form, setForm] = useState(emptyJob(departments[0]?.id ?? ""));
  const [loading, setLoading] = useState(false);

  const openCreate = () => {
    setForm(emptyJob(departments[0]?.id ?? ""));
    setCreateOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditJob(job);
    setForm({
      title: job.title,
      departmentId: job.department.id,
      location: job.location,
      type: job.type,
      salaryMin: job.salaryMin?.toString() ?? "",
      salaryMax: job.salaryMax?.toString() ?? "",
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities ?? "",
      benefits: job.benefits ?? "",
      status: job.status,
    });
  };

  const save = async (mode: "create" | "edit") => {
    setLoading(true);
    try {
      const res = await fetch(mode === "create" ? "/api/jobs" : `/api/jobs/${editJob!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save job"));
        return;
      }
      notify.success(mode === "create" ? "Job posted successfully" : "Job updated successfully");
      setCreateOpen(false);
      setEditJob(null);
      router.refresh();
    } catch {
      notify.error("Failed to save job");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteJob) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${deleteJob.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete job"));
        return;
      }
      notify.success("Job deleted successfully");
      setDeleteJob(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete job");
    } finally {
      setLoading(false);
    }
  };

  const formFields = (
    <div className="space-y-4">
      <input className={inputClass} placeholder="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <select className={inputClass} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input className={inputClass} placeholder="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} placeholder={`Min salary (${currency.symbol})`} value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
        <input className={inputClass} placeholder={`Max salary (${currency.symbol})`} value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
      </div>
      <textarea className={inputClass} rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <textarea className={inputClass} rows={3} placeholder="Requirements" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
      <textarea className={inputClass} rows={3} placeholder="Responsibilities" value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
      <textarea className={inputClass} rows={2} placeholder="Benefits & perks" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
      <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
        <option value="OPEN">Open</option>
        <option value="DRAFT">Draft</option>
        <option value="CLOSED">Closed</option>
      </select>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex flex-wrap gap-3">
          <Link href="/recruitment/candidates" className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1.5">
            <UserRound className="w-4 h-4" />
            Candidates
          </Link>
          <Link href="/recruitment/interviews" className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            Interviews
          </Link>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Post Job
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {initial.map((job) => (
          <Card key={job.id}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <Link href={`/recruitment/${job.id}`} className="min-w-0 group">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-600">{job.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{job.department.name}</p>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(job.status)}
                  {canManage && (
                    <>
                      <button type="button" onClick={() => openEdit(job)} className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteJob(job)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                <span>{job.type}</span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">{job.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">Posted {formatDate(job.postedAt)}</span>
                <Badge variant="info">{job.applications.length} applicants</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen || !!editJob} onClose={() => { setCreateOpen(false); setEditJob(null); }} title={editJob ? "Edit Job" : "Post Job"} size="lg">
        {formFields}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => { setCreateOpen(false); setEditJob(null); }}>Cancel</Button>
          <Button loading={loading} onClick={() => save(editJob ? "edit" : "create")}>Save</Button>
        </div>
      </Dialog>

      <Dialog open={!!deleteJob} onClose={() => setDeleteJob(null)} title="Delete Job">
        <p className="text-sm text-gray-600 mb-4">Delete <strong>{deleteJob?.title}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteJob(null)}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={remove}>Delete</Button>
        </div>
      </Dialog>
    </>
  );
}
