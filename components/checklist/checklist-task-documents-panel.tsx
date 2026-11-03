"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  FileText,
  Link2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { parseDocumentNames } from "@/lib/checklist/documents";

export type TaskFile = {
  id: string;
  documentName: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  uploadedByName: string;
  createdAt: string;
};

export function ChecklistTaskDocumentsPanel({
  taskId,
  requiredDocuments,
  files,
  canManage,
  canUpload,
  onChanged,
}: {
  taskId: string;
  requiredDocuments: unknown;
  files: TaskFile[];
  canManage: boolean;
  canUpload: boolean;
  onChanged: () => void;
}) {
  const required = parseDocumentNames(requiredDocuments);
  const [newName, setNewName] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [extraName, setExtraName] = useState("");
  const extraInput = useRef<HTMLInputElement>(null);

  const filesFor = (name: string) =>
    files.filter((file) => file.documentName.trim().toLowerCase() === name.trim().toLowerCase());

  const extras = files.filter(
    (file) =>
      !required.some((name) => name.trim().toLowerCase() === file.documentName.trim().toLowerCase())
  );

  const saveRequired = async (next: string[]) => {
    setSavingList(true);
    try {
      const res = await fetch(`/api/checklist/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredDocuments: next, taskType: next.length ? "DOCUMENT" : "CHECKBOX" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update document list"));
        return;
      }
      onChanged();
    } finally {
      setSavingList(false);
    }
  };

  const addRequired = async () => {
    const name = newName.trim();
    if (!name) return;
    if (required.some((item) => item.toLowerCase() === name.toLowerCase())) {
      notify.error("That document is already on the list");
      return;
    }
    setNewName("");
    await saveRequired([...required, name]);
  };

  const removeRequired = async (name: string) => {
    await saveRequired(required.filter((item) => item !== name));
  };

  const uploadOne = async (documentName: string, file: File, onProgress: (percent: number) => void) => {
    const signResponse = await fetch(`/api/checklist/tasks/${taskId}/files/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentName, fileName: file.name, mimeType: file.type, fileSize: file.size }),
    });
    if (!signResponse.ok) return await readApiError(signResponse, `Could not prepare ${file.name}`);
    const signed = await signResponse.json() as {
      ticket: string;
      uploadUrl: string;
      params: Record<string, string | number>;
    };
    const cloudinary = await new Promise<{ secure_url: string; public_id: string; resource_type: string; bytes: number }>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", signed.uploadUrl);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onerror = () => reject(new Error("Network error while uploading to Cloudinary."));
      request.onabort = () => reject(new Error("Upload was cancelled."));
      request.onload = () => {
        let result: { secure_url?: string; public_id?: string; resource_type?: string; bytes?: number; error?: { message?: string } };
        try {
          result = JSON.parse(request.responseText || "{}") as typeof result;
        } catch {
          reject(new Error("Cloudinary returned an unreadable upload response."));
          return;
        }
        if (request.status < 200 || request.status >= 300 || !result.secure_url) {
          reject(new Error(result.error?.message || `Cloudinary upload failed (${request.status}).`));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id ?? "", resource_type: result.resource_type ?? "", bytes: result.bytes ?? 0 });
      };
      const form = new FormData();
      form.append("file", file, file.name);
      for (const [key, value] of Object.entries(signed.params)) form.append(key, String(value));
      request.send(form);
    });
    const completeResponse = await fetch(`/api/checklist/tasks/${taskId}/files/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: signed.ticket, ...cloudinary }),
    });
    if (!completeResponse.ok) return await readApiError(completeResponse, `Could not save ${file.name}`);
    onProgress(100);
    return null;
  };

  const uploadFor = async (documentName: string, selectedFiles: File[]) => {
    const queue = selectedFiles.filter((file) => file.size > 0);
    if (queue.length === 0) return;
    setUploading(`${documentName} · preparing ${queue.length} file${queue.length === 1 ? "" : "s"}`);
    let next = 0;
    let completed = 0;
    let succeeded = 0;
    const failures: string[] = [];
    const worker = async () => {
      while (next < queue.length) {
        const index = next++;
        const file = queue[index];
        if (file.size > 100 * 1024 * 1024) {
          failures.push(`${file.name}: files must be 100 MB or smaller`);
          completed += 1;
          continue;
        }
        try {
          const error = await uploadOne(documentName, file, (percent) => {
            setUploading(`${documentName} · ${completed}/${queue.length} files · ${percent}%`);
          });
          if (error) failures.push(`${file.name}: ${error}`);
          else succeeded += 1;
        } catch (error) {
          failures.push(`${file.name}: ${error instanceof Error ? error.message : "Upload failed"}`);
        }
        completed += 1;
        setUploading(`${documentName} · ${completed}/${queue.length} files`);
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(2, queue.length) }, () => worker()));
      if (succeeded) {
        notify.success(`${succeeded} file${succeeded === 1 ? "" : "s"} uploaded for ${documentName}`);
        onChanged();
      }
      if (failures.length) notify.error(failures.slice(0, 3).join("\n"));
    } finally {
      setUploading(null);
    }
  };

  const removeFile = async (fileId: string) => {
    const res = await fetch(`/api/checklist/tasks/${taskId}/files?fileId=${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to remove file"));
      return;
    }
    notify.success("File removed");
    onChanged();
  };

  const copyUploadLink = async (documentName: string) => {
    setLinking(documentName);
    try {
      const res = await fetch("/api/document-upload-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, documentName, reuse: true }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not create the upload link"));
        return;
      }
      const data = (await res.json()) as { url: string };
      try {
        await navigator.clipboard.writeText(data.url);
        notify.success(`Upload link for ${documentName} copied. Send it to the staff member.`);
      } catch {
        notify.error(`Upload link: ${data.url}`);
      }
    } catch {
      notify.error("Could not create the upload link");
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Documents</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            HR and admins set the list. Anyone with access can upload, review, or download. Managers can copy a
            passwordless upload link so staff can file documents without signing in.
          </p>
        </div>
        <Link
          href={`/checklist/tasks/${taskId}`}
          className="text-xs font-medium text-brand-600 hover:underline shrink-0"
        >
          Open documents page
        </Link>
      </div>

      {canManage && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRequired()}
            placeholder="Add a required document, e.g. National ID"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <Button size="sm" loading={savingList} onClick={addRequired} disabled={!newName.trim()}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
      )}

      {required.length === 0 && files.length === 0 ? (
        <p className="text-sm text-gray-400">No documents required yet.</p>
      ) : (
        <div className="space-y-3">
          {required.map((name) => {
            const uploaded = filesFor(name);
            const done = uploaded.length > 0;
            return (
              <div key={name} className="rounded-xl border border-gray-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                    <Badge variant={done ? "success" : "warning"}>
                      {done ? "Uploaded" : "Needed"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => void copyUploadLink(name)}
                        disabled={linking === name}
                        title={`Copy a passwordless upload link for ${name}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        {linking === name ? "Creating…" : "Upload link"}
                      </button>
                    )}
                    {canUpload && (
                      <label className="inline-flex">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.docm,.xls,.xlsx,.xlsm,.ppt,.pptx,.pptm,.csv,.tsv,.txt,.rtf,.odt,.ods,.odp,.md,.json,.xml,.yaml,.yml,.eml,.msg,.zip,.7z,.rar,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.svg,.heic,.heif"
                          multiple
                          className="hidden"
                          disabled={Boolean(uploading)}
                          onChange={(e) => {
                            const selected = Array.from(e.currentTarget.files ?? []);
                            if (selected.length) void uploadFor(name, selected);
                            e.currentTarget.value = "";
                          }}
                        />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <Upload className="w-3.5 h-3.5" />
                          {uploading?.startsWith(`${name} ·`) ? "Uploading…" : "Upload"}
                        </span>
                      </label>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => removeRequired(name)}
                        className="p-1.5 text-gray-400 hover:text-red-500"
                        aria-label={`Remove ${name} from the list`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {uploaded.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {uploaded.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        canRemove={canUpload}
                        onRemove={() => removeFile(file.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {extras.map((file) => (
            <div key={file.id} className="rounded-xl border border-gray-100 p-3">
              <p className="text-xs text-gray-400 mb-1">Additional file</p>
              <FileRow file={file} canRemove={canUpload} onRemove={() => removeFile(file.id)} />
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <div className="flex flex-wrap gap-2 pt-1">
          <input
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            placeholder="Other document name"
            className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            ref={extraInput}
            type="file"
            accept=".pdf,.doc,.docx,.docm,.xls,.xlsx,.xlsm,.ppt,.pptx,.pptm,.csv,.tsv,.txt,.rtf,.odt,.ods,.odp,.md,.json,.xml,.yaml,.yml,.eml,.msg,.zip,.7z,.rar,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.svg,.heic,.heif"
            multiple
            disabled={Boolean(uploading)}
            className="hidden"
            onChange={(e) => {
              const selected = Array.from(e.currentTarget.files ?? []);
              const name = extraName.trim() || selected[0]?.name || "Supporting document";
              if (selected.length) {
                void uploadFor(name, selected);
                setExtraName("");
              }
              e.currentTarget.value = "";
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            loading={Boolean(uploading && uploading.startsWith(`${extraName.trim() || "Supporting document"} ·`))}
            disabled={Boolean(uploading)}
            onClick={() => extraInput.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload other file
          </Button>
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  canRemove,
  onRemove,
}: {
  file: TaskFile;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="min-w-0">
        <a
          href={file.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-brand-600 hover:underline truncate block"
        >
          {file.fileName}
        </a>
        <p className="text-[11px] text-gray-400">
          {file.uploadedByName} · {formatDate(file.createdAt)}
          {file.fileSize ? ` · ${Math.max(1, Math.round(file.fileSize / 1024))} KB` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={file.fileUrl}
          download={file.fileName}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 text-gray-500 hover:text-brand-600"
          aria-label={`Download ${file.fileName}`}
        >
          <Download className="w-3.5 h-3.5" />
        </a>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-500"
            aria-label={`Remove ${file.fileName}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
