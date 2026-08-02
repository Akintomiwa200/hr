"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  content: string;
  author: string;
  priority: string;
  createdAt: Date | string;
};

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function AnnouncementsModule({
  announcements: initial,
  canManage,
}: {
  announcements: Announcement[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editAnn, setEditAnn] = useState<Announcement | null>(null);
  const [deleteAnn, setDeleteAnn] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: "", content: "", priority: "NORMAL" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openEdit = (ann: Announcement) => {
    setEditAnn(ann);
    setForm({ title: ann.title, content: ann.content, priority: ann.priority });
  };

  const save = async (mode: "create" | "edit") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        mode === "create" ? "/api/announcements" : `/api/announcements/${editAnn!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setCreateOpen(false);
      setEditAnn(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteAnn) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements/${deleteAnn.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteAnn(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {canManage && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => { setForm({ title: "", content: "", priority: "NORMAL" }); setCreateOpen(true); }}>
            <Plus className="w-4 h-4" />New Announcement
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {initial.map((ann) => (
          <Card key={ann.id} className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm font-semibold text-gray-900">{ann.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {ann.priority === "HIGH" && <Badge variant="error">High Priority</Badge>}
                    {canManage && (
                      <>
                        <button type="button" onClick={() => openEdit(ann)} className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setDeleteAnn(ann)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{ann.content}</p>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                  <span>By {ann.author}</span>
                  <span>{formatDate(ann.createdAt)}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen || !!editAnn} onClose={() => { setCreateOpen(false); setEditAnn(null); }} title={editAnn ? "Edit Announcement" : "Create Announcement"} size="lg">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={inputClass} rows={5} placeholder="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High Priority</option>
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setEditAnn(null); }}>Cancel</Button>
            <Button loading={loading} onClick={() => save(editAnn ? "edit" : "create")}>Save</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!deleteAnn} onClose={() => setDeleteAnn(null)} title="Delete Announcement">
        <p className="text-sm text-gray-600 mb-4">Delete <strong>{deleteAnn?.title}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteAnn(null)}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={remove}>Delete</Button>
        </div>
      </Dialog>
    </>
  );
}
