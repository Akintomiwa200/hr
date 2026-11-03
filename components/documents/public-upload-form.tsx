"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, X } from "lucide-react";
import { Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { DIRECT_UPLOAD_EXTENSIONS, DIRECT_UPLOAD_MAX_BYTES } from "@/lib/cloudinary-direct-upload";
import { uploadCloudinaryFile } from "@/components/documents/cloudinary-browser-upload";

type UploadLinkState = "ACTIVE" | "REVOKED" | "EXPIRED" | "EXHAUSTED";

const ACCEPT = Array.from(DIRECT_UPLOAD_EXTENSIONS, (ext) => `.${ext}`).join(",");

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadedFile = {
  id: string;
  fileName: string;
  folderPath: string;
  uploadedAt: string;
};

export function PublicUploadForm({
  token,
  documentName,
  initialState,
  initialRemaining,
  maxUploads,
  expiresAt,
  employeeName,
}: {
  token: string;
  documentName: string;
  initialState: UploadLinkState;
  initialRemaining: number;
  maxUploads: number;
  expiresAt: string | null;
  employeeName: string;
}) {
  const [state, setState] = useState<UploadLinkState>(initialState);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = (next: File[]) => {
    const valid = next.filter((file) => file.size <= DIRECT_UPLOAD_MAX_BYTES && DIRECT_UPLOAD_EXTENSIONS.has(file.name.split(".").pop()?.toLowerCase() ?? ""));
    if (valid.length !== next.length) notify.error("Some files were skipped. Choose supported file types up to 100 MB each.");
    if (maxUploads > 0 && valid.length > remaining) notify.error(`This link has room for ${remaining} more file${remaining === 1 ? "" : "s"}.`);
    setFiles(valid.slice(0, maxUploads > 0 ? remaining : undefined));
  };

  const upload = async () => {
    if (!files.length) {
      notify.error("Choose a file to upload.");
      return;
    }
    setUploading(true);
    try {
      const successful: UploadedFile[] = [];
      const failures: string[] = [];
      let nextRemaining = remaining;
      for (const file of files) {
        try {
          const sign = await fetch(`/api/public/upload-links/${token}/sign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type }) });
          if (!sign.ok) throw new Error(await readApiError(sign, "Could not prepare upload"));
          const signed = await sign.json();
          const uploaded = await uploadCloudinaryFile({ uploadUrl: signed.uploadUrl, params: signed.params, file, onProgress: (percent) => setProgress((current) => ({ ...current, [file.name]: percent })) });
          const complete = await fetch(`/api/public/upload-links/${token}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket: signed.ticket, ...uploaded }) });
          if (!complete.ok) throw new Error(await readApiError(complete, "Could not file uploaded document"));
          const data = await complete.json() as UploadedFile & { remainingUploads: number };
          successful.push({ id: data.id, fileName: data.fileName, folderPath: data.folderPath, uploadedAt: data.uploadedAt });
          nextRemaining = data.remainingUploads;
        } catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : "upload failed"}`); }
      }
      setUploads((current) => [...successful, ...current]);
      setRemaining(nextRemaining);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      if (successful.length) notify.success(`${successful.length} file${successful.length === 1 ? "" : "s"} uploaded successfully.`);
      if (failures.length) notify.error(failures.slice(0, 3).join("; "));
      if (nextRemaining <= 0) setState("EXHAUSTED");
    } catch {
      notify.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (state !== "ACTIVE") {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-8 text-center">
        <h2 className="text-base font-semibold text-amber-900">This link is closed</h2>
        <p className="mt-1 text-sm text-amber-700">
          {state === "EXPIRED"
            ? "The upload window has expired."
            : state === "REVOKED"
              ? "HR has revoked this upload link."
              : "The upload limit for this link has been reached."}{" "}
          Ask HR for a new link.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(Array.from(event.dataTransfer.files ?? []));
        }}
        className={`rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
          dragging ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-gray-50/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => choose(Array.from(event.target.files ?? []))}
        />
        <FileUp className="mx-auto h-9 w-9 text-brand-500" />
        <p className="mt-3 text-sm font-medium text-gray-900">
          {files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : `Choose the ${documentName} file`}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Common document, archive, text, and image formats · up to 100 MB per file
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
            Browse files
          </Button>
          {files.length > 0 && (
            <button
              type="button"
              onClick={() => choose([])}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
        {files.map((file) => <p key={`${file.name}-${file.lastModified}`} className="mt-2 text-xs text-gray-400">{file.name} · {formatSize(file.size)} · {progress[file.name] ?? 0}%</p>)}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Uploading as {employeeName}
          {expiresAt ? ` · link expires ${formatDate(expiresAt)}` : ""}
          {maxUploads > 0 ? ` · ${remaining} of ${maxUploads} uploads left` : ""}
        </p>
        <Button loading={uploading} onClick={upload} disabled={!files.length}>
          Upload {files.length > 1 ? `${files.length} documents` : "document"}
        </Button>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Uploaded successfully
          </p>
          <ul className="space-y-1.5">
            {uploads.map((upload) => (
              <li key={upload.id} className="text-xs text-emerald-800">
                <span className="font-medium">{upload.fileName}</span>
                <span className="text-emerald-600"> · filed in {upload.folderPath}</span>
                <span className="text-emerald-600"> · {formatDate(upload.uploadedAt)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-emerald-700">HR can now see the file in the Documents module.</p>
        </div>
      )}
    </div>
  );
}
