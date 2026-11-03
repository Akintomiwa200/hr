"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, Eye, EyeOff, FileText, FolderOpen, Link2, LockKeyhole, Trash2, Upload } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { UploadLinksDialog } from "@/components/documents/upload-links-dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { isSseHandshake } from "@/lib/events";
import { DIRECT_UPLOAD_EXTENSIONS, DIRECT_UPLOAD_MAX_BYTES } from "@/lib/cloudinary-direct-upload";
import { uploadCloudinaryFile } from "@/components/documents/cloudinary-browser-upload";

type DocFile = {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string | null;
  fileSizeLabel: string;
  uploadedBy: string;
  createdAt: string;
  visibility: string;
};

type FolderDetail = {
  id: string;
  name: string;
  description: string | null;
  employeeId: string | null;
  path: { id: string; name: string }[];
  subfolders: { id: string; name: string; fileCount: number }[];
  sharedLabel: string;
  documents: DocFile[];
};

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

export function FolderDetailModule({
  folder,
  canManage,
  employees,
  employeeFilterId,
}: {
  folder: FolderDetail;
  canManage: boolean;
  employees: { id: string; firstName: string; lastName: string }[];
  employeeFilterId?: string;
}) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLinksOpen, setUploadLinksOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<DocFile | null>(null);
  const [pinDoc, setPinDoc] = useState<DocFile | null>(null);
  const [pinMode, setPinMode] = useState<"open" | "protect">("open");
  const [pinValue, setPinValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", files: [] as File[], employeeId: "", visibility: "PRIVATE", protectionPin: "" });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          data?: Record<string, unknown>;
        };
        if (isSseHandshake(payload.type, payload.data)) return;
        if (
          payload.type &&
          payload.type !== "document_updated" &&
          payload.type !== "folder_updated"
        ) {
          return;
        }
        router.refresh();
      } catch {
        // ignore heartbeat / malformed payloads
      }
    };
    return () => es.close();
  }, [router]);

  const upload = async () => {
    setLoading(true);
    try {
      if (!form.files.length) {
        notify.error("Choose one or more files to upload");
        return;
      }
      const files = [...form.files];
      let completed = 0;
      const failures: string[] = [];
      const worker = async () => {
        while (files.length) {
          const file = files.shift()!;
          if (file.size > DIRECT_UPLOAD_MAX_BYTES) { failures.push(`${file.name}: exceeds 100 MB`); continue; }
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
          if (!DIRECT_UPLOAD_EXTENSIONS.has(ext)) { failures.push(`${file.name}: format is not supported`); continue; }
          try {
            const sign = await fetch("/api/documents/upload-sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type, title: form.title.trim() ? `${form.title.trim()}${form.files.length > 1 ? ` - ${file.name}` : ""}` : file.name, folderId: folder.id, employeeId: form.employeeId, visibility: form.visibility, protectionPin: form.protectionPin }) });
            if (!sign.ok) throw new Error(await readApiError(sign, "Could not prepare upload"));
            const signed = await sign.json();
            const uploaded = await uploadCloudinaryFile({ uploadUrl: signed.uploadUrl, params: signed.params, file, onProgress: (percent) => setUploadProgress((current) => ({ ...current, [file.name]: percent })) });
            const complete = await fetch("/api/documents/upload-complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket: signed.ticket, ...uploaded }) });
            if (!complete.ok) throw new Error(await readApiError(complete, "Could not save uploaded file"));
            completed++;
          } catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : "upload failed"}`); }
        }
      };
      await Promise.all(Array.from({ length: Math.min(2, form.files.length) }, worker));
      if (completed) {
        notify.success(`${completed} file${completed === 1 ? "" : "s"} uploaded`);
        setUploadOpen(false);
        setForm({ title: "", files: [], employeeId: "", visibility: "PRIVATE", protectionPin: "" });
        router.refresh();
      }
      if (failures.length) notify.error(failures.slice(0, 3).join("; "));
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

  const toggleVisibility = async (doc: DocFile) => {
    setLoading(true);
    try {
      const visibility = doc.visibility === "PUBLIC" ? "PRIVATE" : doc.visibility === "PROTECTED" ? "PRIVATE" : "PUBLIC";
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update document visibility"));
        return;
      }
      notify.success(visibility === "PUBLIC" ? "Document is public" : "Document is private and protected");
      router.refresh();
    } catch {
      notify.error("Failed to update document visibility");
    } finally {
      setLoading(false);
    }
  };

  const openPinDialog = (doc: DocFile, mode: "open" | "protect") => {
    setPinDoc(doc);
    setPinMode(mode);
    setPinValue("");
  };

  const submitPin = async () => {
    if (!pinDoc || pinValue.length < 4) {
      notify.error("Enter a PIN or password with at least 4 characters");
      return;
    }
    setLoading(true);
    try {
      const protect = pinMode === "protect";
      const res = protect
        ? await fetch(`/api/documents/${pinDoc.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visibility: "PROTECTED", protectionPin: pinValue }),
          })
        : await fetch(`/api/documents/${pinDoc.id}/file`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: pinValue }),
          });
      if (!res.ok) {
        notify.error(await readApiError(res, protect ? "Could not protect the file" : "Could not open the file"));
        return;
      }
      if (protect) {
        notify.success("File is now protected");
        setPinDoc(null);
        router.refresh();
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = pinDoc.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
        setPinDoc(null);
      }
    } catch {
      notify.error("Could not complete that action");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href={employeeFilterId ? `/documents?employeeId=${employeeFilterId}` : "/documents"} className="hover:text-brand-600">
          List Document
        </Link>
        {folder.path.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            {item.id === folder.id ? (
              <span className="text-gray-800">{item.name}</span>
            ) : (
              <Link
                href={`/documents/${item.id}${employeeFilterId ? `?employeeId=${employeeFilterId}` : ""}`}
                className="hover:text-brand-600"
              >
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{folder.name}</h2>
          <Badge variant="info" className="mt-1">
            {folder.sharedLabel}
          </Badge>
          <p className="mt-2 text-xs text-gray-400">
            Storage path: <span className="font-medium text-gray-600">{folder.path.map((item) => item.name).join(" / ")}</span>
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {folder.employeeId && (
              <Button variant="secondary" onClick={() => setUploadLinksOpen(true)}>
                <Link2 className="w-4 h-4" />
                Upload link
              </Button>
            )}
            <Button variant="secondary" onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4" />
              Upload File
            </Button>
          </div>
        )}
      </div>

      {folder.subfolders.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Subfolders</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {folder.subfolders.map((subfolder) => (
              <Link
                key={subfolder.id}
                href={`/documents/${subfolder.id}${employeeFilterId ? `?employeeId=${employeeFilterId}` : ""}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm hover:border-brand-200 hover:bg-brand-50/30"
              >
                <span className="inline-flex min-w-0 items-center gap-2 font-medium text-gray-800">
                  <FolderOpen className="h-4 w-4 shrink-0 text-brand-500" />
                  <span className="truncate">{subfolder.name}</span>
                </span>
                <span className="shrink-0 text-xs text-gray-400">{subfolder.fileCount} file{subfolder.fileCount === 1 ? "" : "s"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {folder.documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-5 py-4 font-medium text-gray-900">{doc.fileName}<span className={`ml-2 text-[10px] uppercase ${doc.visibility === "PUBLIC" ? "text-emerald-600" : "text-amber-600"}`}>{doc.visibility === "PUBLIC" ? "Public" : doc.visibility === "PROTECTED" ? "Protected" : "Private"}</span></td>
                  <td className="px-5 py-4 text-gray-500">{doc.fileSizeLabel}</td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(doc.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <Link
                        href={`/documents/file/${doc.id}${employeeFilterId ? `?employeeId=${employeeFilterId}` : ""}`}
                        title="View document"
                        aria-label={`View ${doc.fileName}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-xs font-medium">View</span>
                      </Link>
                      {doc.fileUrl && doc.visibility === "PROTECTED" && (
                        <button type="button" onClick={() => openPinDialog(doc, "open")} title="Enter PIN to open" className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"><Download className="w-4 h-4" /></button>
                      )}
                      {doc.fileUrl && doc.visibility !== "PROTECTED" && (
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
                        <>
                        {doc.visibility === "PRIVATE" && <button type="button" onClick={() => openPinDialog(doc, "protect")} title="Convert private file to protected" className="p-2 rounded-lg text-amber-600 hover:bg-amber-50"><LockKeyhole className="w-4 h-4" /></button>}
                        <button type="button" onClick={() => toggleVisibility(doc)} disabled={loading}
                          title={doc.visibility === "PUBLIC" ? "Make private" : doc.visibility === "PROTECTED" ? "Remove protection and make private" : "Make public"}
                          className="p-2 rounded-lg text-violet-600 hover:bg-violet-50">
                          {doc.visibility === "PUBLIC" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDoc(doc)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        </>
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
          <input className={inputClass} placeholder="Document title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inputClass} type="file" multiple accept={Array.from(DIRECT_UPLOAD_EXTENSIONS, (ext) => `.${ext}`).join(",")} onChange={(e) => setForm({ ...form, files: Array.from(e.target.files ?? []) })} />
          <p className="text-xs text-gray-500">Up to 100 MB per file. Multiple files upload together.</p>
          {form.files.map((file) => <div key={`${file.name}-${file.lastModified}`} className="text-xs text-gray-600">{file.name} · {uploadProgress[file.name] ?? 0}%</div>)}
          <label className="block text-sm text-gray-700">Visibility
            <select className={`${inputClass} mt-1`} value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              <option value="PRIVATE">Private — uploader and assigned employee</option>
              <option value="PUBLIC">Public — everyone allowed into this folder</option>
              <option value="PROTECTED">Protected — requires a PIN/password</option>
            </select>
          </label>
          {form.visibility === "PROTECTED" && <input className={inputClass} type="password" autoComplete="new-password" placeholder="PIN or password (min 4 characters)" value={form.protectionPin} onChange={(e) => setForm({ ...form, protectionPin: e.target.value })} />}
          <label className="block text-sm text-gray-700">Attach to employee (optional)
            <select className={`${inputClass} mt-1`} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Company document</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
            </select>
          </label>
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
      <UploadLinksDialog
        open={uploadLinksOpen}
        onClose={() => setUploadLinksOpen(false)}
        employees={employees}
        initialEmployeeId={folder.employeeId}
        initialDocumentName={folder.path.length > 1 ? folder.name : ""}
        lockEmployee
      />
      <Dialog open={!!pinDoc} onClose={() => setPinDoc(null)} title={pinMode === "protect" ? "Protect document" : "Open protected document"}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{pinMode === "protect" ? `Set a PIN or password for ${pinDoc?.fileName}. You will need it each time the file is opened.` : `Enter the PIN or password for ${pinDoc?.fileName}.`}</p>
          <input className={inputClass} type="password" autoComplete={pinMode === "protect" ? "new-password" : "current-password"} value={pinValue} onChange={(event) => setPinValue(event.target.value)} placeholder="PIN or password" onKeyDown={(event) => { if (event.key === "Enter") void submitPin(); }} />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPinDoc(null)}>Cancel</Button><Button loading={loading} onClick={submitPin}>{pinMode === "protect" ? "Protect file" : "Open file"}</Button></div>
        </div>
      </Dialog>
    </>
  );
}
