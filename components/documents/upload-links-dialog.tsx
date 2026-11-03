"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

type EmployeeOption = { id: string; firstName: string; lastName: string };

type UploadLinkRow = {
  id: string;
  url: string;
  documentName: string;
  employeeId: string;
  employeeName: string;
  folderPath: string;
  expiresAt: string | null;
  revokedAt: string | null;
  maxUploads: number;
  uploadCount: number;
  lastUsedAt: string | null;
  state: "ACTIVE" | "REVOKED" | "EXPIRED" | "EXHAUSTED";
  stateLabel: string;
};

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  employees: EmployeeOption[];
  initialEmployeeId?: string | null;
  initialDocumentName?: string | null;
  lockEmployee?: boolean;
};

/**
 * Remount the dialog on each open so fields always start from the caller's
 * current folder/employee without syncing props inside an effect.
 */
export function UploadLinksDialog(props: DialogProps) {
  if (!props.open) return null;
  return (
    <UploadLinksDialogContent
      key={`${props.initialEmployeeId ?? ""}:${props.initialDocumentName ?? ""}`}
      {...props}
    />
  );
}

function UploadLinksDialogContent({
  open,
  onClose,
  employees,
  initialEmployeeId,
  initialDocumentName,
  lockEmployee = false,
}: DialogProps) {
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? "");
  const [documentName, setDocumentName] = useState(initialDocumentName ?? "");
  const [expiresInDays, setExpiresInDays] = useState("14");
  const [maxUploads, setMaxUploads] = useState("10");
  const [links, setLinks] = useState<UploadLinkRow[]>([]);
  const [loading, setLoading] = useState(Boolean(initialEmployeeId));
  const [creating, setCreating] = useState(false);
  const [latest, setLatest] = useState<UploadLinkRow | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!employeeId) return;
    try {
      const res = await fetch(`/api/document-upload-links?employeeId=${encodeURIComponent(employeeId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not load upload links"));
        return;
      }
      setLinks((await res.json()) as UploadLinkRow[]);
    } catch {
      notify.error("Could not load upload links");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/document-upload-links?employeeId=${encodeURIComponent(employeeId)}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          notify.error(await readApiError(res, "Could not load upload links"));
          return;
        }
        const data = (await res.json()) as UploadLinkRow[];
        if (!cancelled) setLinks(data);
      } catch {
        if (!cancelled) notify.error("Could not load upload links");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const refresh = async () => {
    setLoading(true);
    await fetchLinks();
  };

  const selectEmployee = (id: string) => {
    setEmployeeId(id);
    setLinks([]);
    setLatest(null);
    setLoading(Boolean(id));
  };

  const create = async () => {
    if (!employeeId) {
      notify.error("Choose an employee first.");
      return;
    }
    if (!documentName.trim()) {
      notify.error("Name the document you are requesting.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/document-upload-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          documentName: documentName.trim(),
          expiresInDays: expiresInDays === "never" ? null : Number(expiresInDays),
          maxUploads: Number(maxUploads),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not create the upload link"));
        return;
      }
      const link = (await res.json()) as UploadLinkRow;
      setLatest(link);
      setLinks((current) => [link, ...current.filter((item) => item.id !== link.id)]);
      notify.success("Upload link created. Copy it and send it to the staff member.");
    } catch {
      notify.error("Could not create the upload link");
    } finally {
      setCreating(false);
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify.success("Upload link copied");
    } catch {
      notify.error("Could not copy the link. Select it and copy manually.");
    }
  };

  const revoke = async (link: UploadLinkRow) => {
    if (!confirm(`Revoke the upload link for ${link.documentName}?`)) return;
    try {
      const res = await fetch(`/api/document-upload-links/${link.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not revoke the link"));
        return;
      }
      notify.success("Upload link revoked");
      setLinks((current) =>
        current.map((item) =>
          item.id === link.id ? { ...item, state: "REVOKED", stateLabel: "Revoked", revokedAt: new Date().toISOString() } : item
        )
      );
      if (latest?.id === link.id) {
        setLatest({ ...latest, state: "REVOKED", stateLabel: "Revoked", revokedAt: new Date().toISOString() });
      }
    } catch {
      notify.error("Could not revoke the link");
    }
  };

  const selectedEmployee = employees.find((employee) => employee.id === employeeId);
  const selectedName = selectedEmployee
    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim()
    : "the staff member";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Passwordless upload links"
      description="Share a link so a staff member can upload without logging in. Files are filed automatically in their own folder."
      size="lg"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Employee
            {lockEmployee && initialEmployeeId ? (
              <input className={`${inputClass} mt-1.5 bg-gray-50`} value={selectedName} readOnly />
            ) : (
              <select
                className={`${inputClass} mt-1.5`}
                value={employeeId}
                onChange={(event) => selectEmployee(event.target.value)}
              >
                <option value="">Choose an employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Document / file name
            <input
              className={`${inputClass} mt-1.5`}
              value={documentName}
              onChange={(event) => setDocumentName(event.target.value)}
              placeholder="e.g. National ID"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Link expires
            <select
              className={`${inputClass} mt-1.5`}
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(event.target.value)}
            >
              <option value="1">In 1 day</option>
              <option value="7">In 7 days</option>
              <option value="14">In 14 days</option>
              <option value="30">In 30 days</option>
              <option value="60">In 60 days</option>
              <option value="never">Never</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Maximum uploads
            <input
              className={`${inputClass} mt-1.5`}
              type="number"
              min={1}
              max={100}
              value={maxUploads}
              onChange={(event) => setMaxUploads(event.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
          <p className="text-xs text-gray-500">
            Files will be saved to <span className="font-medium text-gray-700">{selectedName}</span>
            {documentName.trim() ? (
              <>
                {" / "}
                <span className="font-medium text-gray-700">{documentName.trim()}</span>
              </>
            ) : null}
          </p>
          <Button loading={creating} onClick={create}>
            <Link2 className="h-4 w-4" /> Create upload link
          </Button>
        </div>

        {latest && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Share this link</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={latest.url}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs text-gray-700"
              />
              <Button size="sm" variant="secondary" onClick={() => void copy(latest.url)}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <a href={latest.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-700 hover:underline">
                Open
              </a>
            </div>
            <p className="mt-2 text-[11px] text-brand-700/80">
              Send this link to {latest.employeeName}. They can upload {latest.documentName} without logging in; the file
              appears in {latest.folderPath}.
            </p>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Existing links</h3>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {!employeeId ? (
            <p className="text-sm text-gray-400">Choose an employee to see their upload links.</p>
          ) : loading ? (
            <p className="text-sm text-gray-400">Loading upload links…</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-gray-400">No upload links yet.</p>
          ) : (
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{link.documentName}</p>
                        <Badge
                          variant={
                            link.state === "ACTIVE"
                              ? "success"
                              : link.state === "EXHAUSTED"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {link.stateLabel}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {link.folderPath} · {link.uploadCount}/{link.maxUploads} uploads
                        {link.expiresAt ? ` · expires ${formatDate(link.expiresAt)}` : " · no expiry"}
                        {link.lastUsedAt ? ` · last used ${formatDate(link.lastUsedAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void copy(link.url)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                      {link.state === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => void revoke(link)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Revoke link for ${link.documentName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
