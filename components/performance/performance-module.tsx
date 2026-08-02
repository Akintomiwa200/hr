"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { formatDate, fullName } from "@/lib/utils";

type Review = {
  id: string;
  period: string;
  goals: string;
  achievements: string | null;
  feedback: string | null;
  rating: number | null;
  status: string;
  reviewDate: Date | string | null;
  employee: { id: string; firstName: string; lastName: string };
  manager: { firstName: string; lastName: string };
};

type EmployeeOption = { id: string; firstName: string; lastName: string };

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function PerformanceModule({
  reviews: initial,
  employees,
  canManage,
}: {
  reviews: Review[];
  employees: EmployeeOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [deleteReview, setDeleteReview] = useState<Review | null>(null);
  const [form, setForm] = useState({
    employeeId: employees[0]?.id ?? "",
    period: "",
    goals: "",
    achievements: "",
    feedback: "",
    rating: "4",
    status: "DRAFT",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openCreate = () => {
    setForm({
      employeeId: employees[0]?.id ?? "",
      period: "",
      goals: "",
      achievements: "",
      feedback: "",
      rating: "4",
      status: "DRAFT",
    });
    setCreateOpen(true);
  };

  const openEdit = (review: Review) => {
    setEditReview(review);
    setForm({
      employeeId: review.employee.id,
      period: review.period,
      goals: review.goals,
      achievements: review.achievements ?? "",
      feedback: review.feedback ?? "",
      rating: review.rating?.toString() ?? "4",
      status: review.status,
    });
  };

  const save = async (mode: "create" | "edit") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        mode === "create" ? "/api/performance" : `/api/performance/${editReview!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setCreateOpen(false);
      setEditReview(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteReview) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/performance/${deleteReview.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteReview(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const formFields = (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {createOpen && (
        <select className={inputClass} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{fullName(e.firstName, e.lastName)}</option>
          ))}
        </select>
      )}
      <input className={inputClass} placeholder="Review period (e.g. Q2 2026)" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
      <textarea className={inputClass} rows={3} placeholder="Goals" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
      <textarea className={inputClass} rows={2} placeholder="Achievements" value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} />
      <textarea className={inputClass} rows={2} placeholder="Feedback" value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <select className={inputClass} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} / 5</option>
          ))}
        </select>
        <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="DRAFT">Draft</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
    </div>
  );

  return (
    <>
      {canManage && (
        <div className="flex justify-end mb-4">
          <Button onClick={openCreate}><Plus className="w-4 h-4" />New Review</Button>
        </div>
      )}

      {initial.length === 0 ? (
        <Card><EmptyState icon={Star} title="No performance reviews" description="Create a review to get started." /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {initial.map((review) => (
            <Card key={review.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{fullName(review.employee.firstName, review.employee.lastName)}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Period: {review.period}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(review.status)}
                  {canManage && (
                    <>
                      <button type="button" onClick={() => openEdit(review)} className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg"><Pencil className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setDeleteReview(review)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
              {review.rating && (
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < review.rating! ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-700">{review.goals}</p>
              {review.reviewDate && <p className="text-xs text-gray-400 mt-4">Reviewed {formatDate(review.reviewDate)}</p>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen || !!editReview} onClose={() => { setCreateOpen(false); setEditReview(null); }} title={editReview ? "Edit Review" : "New Review"} size="lg">
        {formFields}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => { setCreateOpen(false); setEditReview(null); }}>Cancel</Button>
          <Button loading={loading} onClick={() => save(editReview ? "edit" : "create")}>Save</Button>
        </div>
      </Dialog>

      <Dialog open={!!deleteReview} onClose={() => setDeleteReview(null)} title="Delete Review">
        <p className="text-sm text-gray-600 mb-4">Delete this performance review?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteReview(null)}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={remove}>Delete</Button>
        </div>
      </Dialog>
    </>
  );
}
