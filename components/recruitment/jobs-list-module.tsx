"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { JobWizard } from "@/components/recruitment/job-wizard";
import { notify, readApiError } from "@/lib/toast";
import { formatRelativeTime } from "@/lib/utils";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_OPTIONS,
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
  const [statusMenu, setStatusMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const updateStatus = async (jobId: string, status: JobStatus) => {
    setLoading(true);
    setStatusMenu(null);
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
  };

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
                {canManage && (
                  <div className="relative">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setStatusMenu(statusMenu === job.id ? null : job.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Status
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {statusMenu === job.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1">
                        {JOB_STATUS_OPTIONS.map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void updateStatus(job.id, status)}
                            className="w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50 flex items-center justify-between"
                          >
                            {JOB_STATUS_LABELS[status]}
                            {job.status === status && <span className="text-brand-600">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <span className="text-[11px] text-gray-400 whitespace-nowrap">
                  Created {formatRelativeTime(job.postedAt)}
                </span>
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
