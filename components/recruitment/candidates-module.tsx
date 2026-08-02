"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import { Button, Card, CardHeader, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";

type Application = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  appliedAt: Date | string;
  job: { id: string; title: string };
  reviewer: { id: string; firstName: string; lastName: string } | null;
};

type Reviewer = { id: string; firstName: string; lastName: string };

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

const STATUSES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

export function CandidatesModule({
  applications: initial,
  reviewers,
  canManage,
}: {
  applications: Application[];
  reviewers: Reviewer[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [status, setStatus] = useState("APPLIED");
  const [reviewerId, setReviewerId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const openEdit = (app: Application) => {
    setEditApp(app);
    setStatus(app.status);
    setReviewerId(app.reviewer?.id ?? "");
    setNotes(app.notes ?? "");
  };

  const save = async () => {
    if (!editApp) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${editApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewerId: reviewerId || null, notes }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update candidate"));
        return;
      }
      notify.success("Candidate updated successfully");
      setEditApp(null);
      router.refresh();
    } catch {
      notify.error("Failed to update candidate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <Link href="/recruitment" className="text-sm font-medium text-violet-600 hover:text-violet-700">
          ← Back to jobs
        </Link>
      </div>

      <Card>
        <CardHeader title="All Applications" description={`${initial.length} total candidates`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Candidate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Position</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Applied</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initial.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{fullName(app.firstName, app.lastName)}</p>
                    <p className="text-xs text-gray-500">{app.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{app.job.title}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(app.appliedAt)}</td>
                  <td className="px-4 py-3">{statusBadge(app.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link href={`/recruitment/candidates/${app.id}`} className="p-2 text-gray-400 hover:text-violet-600 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {canManage && (
                        <button type="button" onClick={() => openEdit(app)} className="p-2 text-gray-400 hover:text-violet-600 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editApp} onClose={() => setEditApp(null)} title="Update Candidate">
        <div className="space-y-4">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className={inputClass} value={reviewerId} onChange={(e) => setReviewerId(e.target.value)}>
            <option value="">No reviewer</option>
            {reviewers.map((r) => (
              <option key={r.id} value={r.id}>{fullName(r.firstName, r.lastName)}</option>
            ))}
          </select>
          <textarea className={inputClass} rows={4} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditApp(null)}>Cancel</Button>
            <Button loading={loading} onClick={save}>Save</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
