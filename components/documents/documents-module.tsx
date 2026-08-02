"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";

type DocumentRow = {
  id: string;
  title: string;
  category: string;
  fileUrl: string | null;
  createdAt: Date | string;
  employee: { firstName: string; lastName: string } | null;
};

type EmployeeOption = { id: string; firstName: string; lastName: string };

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function DocumentsModule({
  documents: initial,
  employees,
  canManage,
}: {
  documents: DocumentRow[];
  employees: EmployeeOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<DocumentRow | null>(null);
  const [form, setForm] = useState({ title: "", category: "Policy", fileUrl: "", employeeId: "" });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to upload document"));
        return;
      }
      notify.success("Document uploaded successfully");
      setCreateOpen(false);
      router.refresh();
    } catch {
      notify.error("Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteDoc) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${deleteDoc.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete document"));
        return;
      }
      notify.success("Document deleted successfully");
      setDeleteDoc(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete document");
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(initial.map((d) => d.category))];

  return (
    <>
      {canManage && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" />Upload Document</Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <Badge key={cat} variant="info">{cat}</Badge>
        ))}
      </div>

      {initial.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No documents" description="Upload company documents." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initial.map((doc) => (
            <Card key={doc.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h3>
                  <Badge variant="neutral">{doc.category}</Badge>
                  {doc.employee && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {fullName(doc.employee.firstName, doc.employee.lastName)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{formatDate(doc.createdAt)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  {canManage && (
                    <button type="button" onClick={() => setDeleteDoc(doc)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Upload Document">
        <div className="space-y-4">
          <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inputClass} placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className={inputClass} placeholder="File URL" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
          <select className={inputClass} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">Company-wide</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{fullName(e.firstName, e.lastName)}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={save}>Upload</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!deleteDoc} onClose={() => setDeleteDoc(null)} title="Delete Document">
        <p className="text-sm text-gray-600 mb-4">Delete <strong>{deleteDoc?.title}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteDoc(null)}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={remove}>Delete</Button>
        </div>
      </Dialog>
    </>
  );
}
