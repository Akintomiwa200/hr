"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Download,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Badge, Button, Card, CardHeader } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";

type ArchiveRow = {
  id: string;
  month: string;
  recordCount: number;
  bytes: number;
  createdAt: string;
  restored: boolean;
  restoredAt: string | null;
  createdBy: string | null;
};

type ListResponse = {
  archives: ArchiveRow[];
  cloudinaryConfigured: boolean;
};

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMonth(month: string) {
  const [year, mm] = month.split("-");
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const index = Number(mm) - 1;
  return `${names[index] ?? mm} ${year}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AttendanceArchivePanel() {
  const [archives, setArchives] = useState<ArchiveRow[]>([]);
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const prev = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const year = prev.getUTCFullYear();
  const [archiveYear, setArchiveYear] = useState<number>(year);
  const [archiveMonth, setArchiveMonth] = useState<number>(prev.getUTCMonth() + 1);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/archive");
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to load archives"));
        return;
      }
      const data = (await res.json()) as ListResponse;
      setArchives(data.archives);
      setCloudinaryConfigured(data.cloudinaryConfigured);
    } catch {
      notify.error("Failed to load archives");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/attendance/archive")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load failed"))))
      .then((data: ListResponse) => {
        if (!active) return;
        setArchives(data.archives);
        setCloudinaryConfigured(data.cloudinaryConfigured);
      })
      .catch(() => {
        if (active) notify.error("Failed to load archives");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const archive = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/attendance/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: archiveYear, month: archiveMonth }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to archive month"));
        return;
      }
      notify.success("Attendance archived to Cloudinary");
      await load();
    } catch {
      notify.error("Failed to archive month");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (id: string) => {
    if (!window.confirm("Restore this month back into the database? Live records for the same day may be merged.")) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/attendance/archive/${id}`, { method: "POST" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to restore month"));
        return;
      }
      notify.success("Attendance restored to the database");
      await load();
    } catch {
      notify.error("Failed to restore month");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this archive? The Cloudinary file will also be removed.")) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/attendance/archive/${id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete archive"));
        return;
      }
      notify.success("Archive deleted");
      await load();
    } catch {
      notify.error("Failed to delete archive");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {!cloudinaryConfigured && (
        <Card className="p-4 border-amber-200 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <TriangleAlert className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Cloudinary is not configured
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Add <code className="bg-amber-100 px-1 rounded">CLOUDINARY_CLOUD_NAME</code>,{" "}
                <code className="bg-amber-100 px-1 rounded">CLOUDINARY_API_KEY</code>, and{" "}
                <code className="bg-amber-100 px-1 rounded">CLOUDINARY_API_SECRET</code> to your
                environment to archive attendance to Cloudinary.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Archive an attendance month"
          description="Moves a full calendar month of attendance, breaks, and device punches to Cloudinary JSON, then removes them from the primary database to free space."
        />
        <div className="p-6">
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Year</label>
              <select
                className={`${inputClass} mt-1`}
                value={archiveYear}
                onChange={(e) => setArchiveYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => year - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Month</label>
              <select
                className={`${inputClass} mt-1`}
                value={archiveMonth}
                onChange={(e) => setArchiveMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {formatMonth(`${year}-${String(m).padStart(2, "0")}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Button onClick={archive} loading={busy} disabled={!cloudinaryConfigured}>
                <Archive className="w-4 h-4" />
                Archive month
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Tip: archive months that are already closed. The current month and any months still
            needed for payroll should stay in the database.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Stored archives"
          description="Attendance months already moved to Cloudinary."
        />
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading archives…</div>
        ) : archives.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No archives yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {archives.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{formatMonth(a.month)}</p>
                    {a.restored ? (
                      <Badge variant="info">Restored</Badge>
                    ) : (
                      <Badge variant="success">Archived</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {a.recordCount.toLocaleString()} records · {formatBytes(a.bytes)} · archived{" "}
                    {formatDate(a.createdAt)}
                    {a.createdBy ? ` by ${a.createdBy}` : ""}
                    {a.restoredAt ? ` · restored ${formatDate(a.restoredAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => restore(a.id)}
                    loading={busyId === a.id}
                    disabled={a.restored}
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Restore
                  </Button>
                  <a
                    href={a.id ? `/api/attendance/archive/${a.id}/download` : "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(a.id)}
                    loading={busyId === a.id}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
