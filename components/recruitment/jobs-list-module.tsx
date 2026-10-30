"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Eye,
  FileText,
  Link2,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { JobWizard } from "@/components/recruitment/job-wizard";
import { notify, readApiError } from "@/lib/toast";
import { formatRelativeTime } from "@/lib/utils";
import {
  JOB_STATUS_LABELS,
  jobStatusBadgeClass,
} from "@/lib/recruitment/constants";
import type { JobStatus } from "@prisma/client";

type Department = { id: string; name: string };
type Employee = { id: string; firstName: string; lastName: string; email: string };
type Job = {
  id: string;
  title: string;
  location: string;
  office: string | null;
  type: string;
  status: JobStatus;
  postedAt: Date | string;
  department: Department;
  applications: { id: string }[];
};

const inputClass =
  "w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400";

export function JobsListModule({
  jobs: initial,
  departments,
  employees,
  canManage,
}: {
  jobs: Job[];
  departments: Department[];
  employees: Employee[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteJob, setDeleteJob] = useState<Job | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        job.department.name.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q)
    );
  }, [initial, search]);

  const updateStatus = useCallback(async (jobId: string, status: JobStatus) => {
    setLoading(true);
    setMenuOpen(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update status"));
        return;
      }
      notify.success("Job status updated");
      router.refresh();
    } catch {
      notify.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleDelete = useCallback(async () => {
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
  }, [deleteJob, router]);

  const duplicateJob = useCallback(async (job: Job) => {
    setLoading(true);
    setMenuOpen(null);
    try {
      // Fetch full job data first
      const getRes = await fetch(`/api/jobs/${job.id}`);
      if (!getRes.ok) {
        notify.error("Failed to fetch job details");
        return;
      }
      const fullJob = await getRes.json();

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${fullJob.title} (Copy)`,
          departmentId: fullJob.departmentId,
          location: fullJob.location,
          office: fullJob.office,
          type: fullJob.type,
          quantity: fullJob.quantity,
          expectedClosingDate: fullJob.expectedClosingDate,
          salaryMin: fullJob.salaryMin,
          salaryMax: fullJob.salaryMax,
          description: fullJob.description,
          requirements: fullJob.requirements,
          responsibilities: fullJob.responsibilities,
          benefits: fullJob.benefits,
          status: "DRAFT",
          hiringTeam: fullJob.hiringTeam ? JSON.parse(fullJob.hiringTeam) : [],
          pipelineStages: fullJob.pipelineStages ? JSON.parse(fullJob.pipelineStages) : null,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to duplicate job"));
        return;
      }
      notify.success("Job duplicated as draft");
      router.refresh();
    } catch {
      notify.error("Failed to duplicate job");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const copyApplicationLink = useCallback(async (jobId: string) => {
    const url = `${window.location.origin}/careers/${jobId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(jobId);
      notify.success("Application link copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      notify.error("Failed to copy link");
    }
  }, []);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className={`${inputClass} pl-10`}
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4" />
            Add New
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.map((job) => (
          <div
            key={job.id}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-brand-100 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Link href={`/recruitment/${job.id}`} className="text-[15px] font-semibold text-gray-900 hover:text-brand-600">
                    {job.title}
                  </Link>
                  <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${jobStatusBadgeClass(job.status)}`}>
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                </div>
                <p className="text-[13px] text-gray-500">
                  {job.department.name} · {job.location}
                  {job.office ? ` · ${job.office}` : ""}
                </p>
                <p className="text-[12px] text-gray-400 mt-2">
                  {job.applications.length} candidate{job.applications.length === 1 ? "" : "s"} applied
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-gray-400 whitespace-nowrap">
                  Created {formatRelativeTime(job.postedAt)}
                </span>

                {/* Actions dropdown */}
                <div className="relative" ref={menuOpen === job.id ? menuRef : undefined}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setMenuOpen(menuOpen === job.id ? null : job.id)}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Actions"
                    aria-label={`Actions for ${job.title}`}
                    aria-expanded={menuOpen === job.id}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {menuOpen === job.id && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-30 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* View Job */}
                      <Link
                        href={`/recruitment/${job.id}`}
                        onClick={() => setMenuOpen(null)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4 text-gray-400" />
                        View job
                      </Link>

                      {/* Copy Application Link */}
                      <button
                        type="button"
                        onClick={() => { void copyApplicationLink(job.id); setMenuOpen(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                      >
                        {copiedId === job.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Link2 className="w-4 h-4 text-gray-400" />
                        )}
                        {copiedId === job.id ? "Link copied!" : "Copy application link"}
                      </button>

                      {canManage && (
                        <>
                          {/* Divider */}
                          <div className="border-t border-gray-100 my-1" />

                          {/* Status changes — show relevant options based on current status */}
                          {job.status !== "OPEN" && (
                            <button
                              type="button"
                              onClick={() => void updateStatus(job.id, "OPEN")}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-green-700 hover:bg-green-50"
                            >
                              <Play className="w-4 h-4" />
                              Set active
                            </button>
                          )}

                          {job.status !== "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => void updateStatus(job.id, "DRAFT")}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-amber-700 hover:bg-amber-50"
                            >
                              <FileText className="w-4 h-4" />
                              Set as draft
                            </button>
                          )}

                          {job.status !== "INACTIVE" && (
                            <button
                              type="button"
                              onClick={() => void updateStatus(job.id, "INACTIVE")}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-orange-700 hover:bg-orange-50"
                            >
                              <Pause className="w-4 h-4" />
                              Suspend job
                            </button>
                          )}

                          {job.status !== "CLOSED" && (
                            <button
                              type="button"
                              onClick={() => void updateStatus(job.id, "CLOSED")}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-600 hover:bg-gray-50"
                            >
                              <XCircle className="w-4 h-4" />
                              Close job
                            </button>
                          )}

                          {/* Divider */}
                          <div className="border-t border-gray-100 my-1" />

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => void duplicateJob(job)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                          >
                            <Copy className="w-4 h-4 text-gray-400" />
                            Duplicate job
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => { setDeleteJob(job); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete job
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
            <p className="text-gray-500">No jobs found. {canManage ? "Create your first job posting." : ""}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteJob}
        onClose={() => setDeleteJob(null)}
        title="Delete job"
        description="This action cannot be undone. All candidate applications associated with this job will also be removed."
        size="sm"
      >
        {deleteJob && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <strong>{deleteJob.title}</strong>?
              {deleteJob.applications.length > 0 && (
                <span className="text-red-600 block mt-1">
                  This job has {deleteJob.applications.length} candidate{deleteJob.applications.length === 1 ? "" : "s"} applied.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                {loading ? "Deleting..." : "Delete job"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteJob(null)}
                className="px-4 py-2 text-[13px] text-gray-500 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Dialog>

      <JobWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        departments={departments}
        employees={employees}
        onSuccess={() => {
          setWizardOpen(false);
          setSuccessOpen(true);
          router.refresh();
        }}
      />

      <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} title="" size="sm">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 text-3xl flex items-center justify-center mx-auto mb-4">✓</div>
          <h3 className="text-lg font-semibold text-gray-900">Add Job Success!</h3>
          <p className="text-sm text-gray-500 mt-2">New job has been successfully created. Stay tuned!</p>
          <Button className="w-full mt-6" onClick={() => setSuccessOpen(false)}>Check Now</Button>
        </div>
      </Dialog>
    </>
  );
}
