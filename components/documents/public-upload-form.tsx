"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, X } from "lucide-react";
import { Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

type UploadLinkState = "ACTIVE" | "REVOKED" | "EXPIRED" | "EXHAUSTED";

const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.rtf,.odt,.ods,.jpg,.jpeg,.png,.gif,.webp";

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
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > 20 * 1024 * 1024) {
      notify.error("Files must be 20 MB or smaller.");
      return;
    }
    setFile(next);
  };

  const upload = async () => {
    if (!file) {
      notify.error("Choose a file to upload.");
      return;
    }
    setUploading(true);
    try {
      const payload = new FormData();
      payload.set("file", file);
      const res = await fetch(`/api/public/upload-links/${token}`, {
        method: "POST",
        body: payload,
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Upload failed. Please try again."));
        return;
      }
      const data = (await res.json()) as UploadedFile & { remainingUploads: number };
      setUploads((current) => [
        { id: data.id, fileName: data.fileName, folderPath: data.folderPath, uploadedAt: data.uploadedAt },
        ...current,
      ]);
      setRemaining(data.remainingUploads);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      notify.success(`${documentName} uploaded successfully.`);
      if (data.remainingUploads <= 0) setState("EXHAUSTED");
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
          choose(event.dataTransfer.files?.[0] ?? null);
        }}
        className={`rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
          dragging ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-gray-50/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />
        <FileUp className="mx-auto h-9 w-9 text-brand-500" />
        <p className="mt-3 text-sm font-medium text-gray-900">
          {file ? file.name : `Choose the ${documentName} file`}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, Office, OpenDocument, CSV, text, or image · up to 20 MB
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
            Browse files
          </Button>
          {file && (
            <button
              type="button"
              onClick={() => choose(null)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
        {file && <p className="mt-2 text-xs text-gray-400">{formatSize(file.size)}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Uploading as {employeeName}
          {expiresAt ? ` · link expires ${formatDate(expiresAt)}` : ""}
          {maxUploads > 0 ? ` · ${remaining} of ${maxUploads} uploads left` : ""}
        </p>
        <Button loading={uploading} onClick={upload} disabled={!file}>
          Upload document
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
