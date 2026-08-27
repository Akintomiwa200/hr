"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import {
  ChecklistTaskDocumentsPanel,
  type TaskFile,
} from "./checklist-task-documents-panel";

export function ChecklistTaskDocumentsPage({
  taskId,
  title,
  description,
  status: initialStatus,
  requiredDocuments,
  files: initialFiles,
  canManage,
  backHref,
  employeeName,
}: {
  taskId: string;
  title: string;
  description: string | null;
  status: string;
  requiredDocuments: unknown;
  files: TaskFile[];
  canManage: boolean;
  backHref: string;
  employeeName: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [required, setRequired] = useState(requiredDocuments);
  const [files, setFiles] = useState(initialFiles);
  const [completing, setCompleting] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/checklist/tasks/${taskId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setStatus(data.status);
    setRequired(data.requiredDocuments);
    setFiles(data.files ?? []);
  }, [taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const complete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/checklist/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Cannot complete yet"));
        return;
      }
      notify.success("Task completed");
      await reload();
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href={backHref} className="text-sm text-brand-600 hover:underline">
        ← Back to checklist
      </Link>
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{employeeName}</p>
            <h2 className="text-lg font-semibold text-gray-900 mt-1">{title}</h2>
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={status === "COMPLETED" ? "success" : "warning"}>{status}</Badge>
            {status !== "COMPLETED" && (
              <Button size="sm" loading={completing} onClick={complete}>
                Complete
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <ChecklistTaskDocumentsPanel
          taskId={taskId}
          requiredDocuments={required}
          files={files}
          canManage={canManage}
          canUpload
          onChanged={() => void reload()}
        />
      </div>
    </div>
  );
}
