"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, FileText, Trash2, Upload } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

type DocFile = {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string | null;
  fileSizeLabel: string;
  uploadedBy: string;
  createdAt: string;
};

type FolderDetail = {
  id: string;
  name: string;
  description: string | null;
  sharedLabel: string;
  documents: DocFile[];
};

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

export function FolderDetailModule({
  folder,
  canManage,
}: {
  folder: FolderDetail;
  canManage: boolean;
}) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<DocFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", fileUrl: "", fileName: "", fileSize: "" });

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = () => router.refresh();
    return () => es.close();
  }, [router]);

  const upload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          category: folder.name,
          fileUrl: form.fileUrl,
          fileName: form.fileName || form.title,
          fileSize: form.fileSize ? Number(form.fileSize) : undefined,
          folderId: folder.id,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to upload file"));
        return;
      }
      notify.success("File uploaded");
      setUploadOpen(false);
      setForm({ title: "", fileUrl: "", fileName: "", fileSize: "" });
      router.refresh();
    } catch {
      notify.error("Failed to upload file");
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
        notify.error(await readApiError(res, "Failed to delete file"));
        return;
      }
      notify.success("File deleted");
      setDeleteDoc(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/documents" className="hover:text-brand-600">
          List Document
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-800">{folder.name}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{folder.name}</h2>
          <Badge variant="info" className="mt-1">
            {folder.sharedLabel}
          </Badge>
        </div>
        {canManage && (
          <Button variant="secondary" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4" />
            Upload File
          </Button>
        )}
      </div>

      {folder.documents.length === 0 ? (
        <Card className="py-16 text-center">
          <EmptyState
            icon={FileText}
            title="There's no document here"
            description='Add a document by clicking "Upload File" below.'
          />
          {canManage && (
            <Button className="mt-4" onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4" />
              Upload File
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Size</th>
                <th className="px-5 py-3">Uploaded</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {folder.documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-5 py-4 font-medium text-gray-900">{doc.fileName}</td>
                  <td className="px-5 py-4 text-gray-500">{doc.fileSizeLabel}</td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(doc.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setDeleteDoc(doc)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload File">
        <div className="space-y-4">
          <input className={inputClass} placeholder="Document title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inputClass} placeholder="File name" value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} />
          <input className={inputClass} placeholder="File URL" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
          <input className={inputClass} placeholder="File size (bytes)" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={upload}>Upload</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!deleteDoc} onClose={() => setDeleteDoc(null)} title="Delete File">
        <p className="text-sm text-gray-600 mb-4">Delete <strong>{deleteDoc?.fileName}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteDoc(null)}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={remove}>Delete</Button>
        </div>
      </Dialog>
    </>
  );
}
