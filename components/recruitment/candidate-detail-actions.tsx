"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui";
import { fullName } from "@/lib/utils";

const STATUSES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function CandidateDetailActions({
  application,
  reviewers,
}: {
  application: {
    id: string;
    status: string;
    reviewerId: string | null;
    notes: string | null;
  };
  reviewers: { id: string; firstName: string; lastName: string }[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(application.status);
  const [reviewerId, setReviewerId] = useState(application.reviewerId ?? "");
  const [notes, setNotes] = useState(application.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewerId: reviewerId || null, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Update Application</h3>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
        <Button loading={loading} onClick={save}>Save Changes</Button>
      </div>
      <textarea
        className={inputClass}
        rows={4}
        placeholder="Internal notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </Card>
  );
}
