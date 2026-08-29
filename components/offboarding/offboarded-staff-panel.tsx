"use client";

import { useCallback, useEffect, useState } from "react";
import { ArchiveRestore, Trash2, UserCheck2 } from "lucide-react";
import { Badge, Button, Card, CardHeader } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";

type OffboardedRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeCode: string | null;
  jobTitle: string;
  department: string | null;
  branch: string | null;
  role: string | null;
  endDate: string;
  deleteAt: string;
  daysLeft: number;
  expired: boolean;
  retentionDays: number;
};

type ListResponse = {
  employees: OffboardedRow[];
  retentionDays: number;
  purge: { deleted: number; scanned: number; remaining: number };
};

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fullName(row: OffboardedRow) {
  return `${row.firstName} ${row.lastName}`;
}

export function OffboardedStaffPanel() {
  const [employees, setEmployees] = useState<OffboardedRow[]>([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<OffboardedRow | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/offboarded");
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to load offboarded staff"));
        return;
      }
      const data = (await res.json()) as ListResponse;
      setEmployees(data.employees);
      setRetentionDays(data.retentionDays);
    } catch {
      notify.error("Failed to load offboarded staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/offboarded")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load failed"))))
      .then((data: ListResponse) => {
        if (!active) return;
        setEmployees(data.employees);
        setRetentionDays(data.retentionDays);
      })
      .catch(() => {
        if (active) notify.error("Failed to load offboarded staff");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveRetentionDays = async () => {
    setSettingsBusy(true);
    try {
      const res = await fetch("/api/offboarding/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not save setting"));
        return;
      }
      notify.success("Retention updated", `Offboarded staff are kept ${retentionDays} days before deletion.`);
      await load(true);
    } catch {
      notify.error("Could not save setting");
    } finally {
      setSettingsBusy(false);
    }
  };

  const deleteNow = async () => {
    if (!confirming) return;
    const row = confirming;
    setDeletingId(row.id);
    setConfirming(null);
    try {
      const res = await fetch(`/api/offboarded/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not delete staff"));
        return;
      }
      notify.success("Deleted", `${fullName(row)} was permanently removed from the database.`);
      await load(true);
    } catch {
      notify.error("Could not delete staff");
    } finally {
      setDeletingId(null);
    }
  };

  const purgeExpired = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/offboarded", { method: "POST" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not purge expired staff"));
        return;
      }
      const data = (await res.json()) as Pick<ListResponse, "employees" | "purge">;
      setEmployees(data.employees);
      if (data.purge?.deleted) {
        notify.success("Purged", `${data.purge.deleted} expired record(s) permanently deleted.`);
      } else {
        notify.success("No expired records", "Nothing was past its retention window.");
      }
    } catch {
      notify.error("Could not purge expired staff");
    } finally {
      setBusy(false);
    }
  };

  const expiredCount = employees.filter((e) => e.expired).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Offboarded staff"
          description="When a staff member is offboarded, their record is kept for a set number of days before it is permanently deleted from the database."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={purgeExpired}
              loading={busy}
              disabled={expiredCount === 0}
            >
              <Trash2 className="w-4 h-4" />
              Delete {expiredCount} expired
            </Button>
          }
        />

        <div className="px-6 pb-6 space-y-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Keep offboarded staff for (days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={365}
                    className={inputClass}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                  />
                  <Button onClick={saveRetentionDays} loading={settingsBusy} size="sm">
                    Save
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 sm:max-w-xs">
                Staff are permanently deleted {retentionDays} days after their last working day (end date). Expired
                records are removed automatically the next time this page is opened.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading offboarded staff">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-4 bg-white border border-gray-100 rounded-xl animate-pulse"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-44 bg-gray-200 rounded" />
                      <div className="h-4 w-20 bg-gray-100 rounded-full" />
                    </div>
                    <div className="h-3 w-64 bg-gray-100 rounded" />
                    <div className="h-3 w-48 bg-gray-100 rounded" />
                  </div>
                  <div className="h-8 w-28 bg-gray-100 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mb-3">
                <UserCheck2 className="w-6 h-6 text-violet-500" />
              </div>
              <p className="text-sm font-semibold text-gray-900">No offboarded staff</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                When a staff member is offboarded, they appear here and are automatically deleted after the retention
                window you set above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {employees.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 p-4 bg-white">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{fullName(row)}</p>
                      {row.expired ? (
                        <Badge variant="error">Expired — deletes now</Badge>
                      ) : (
                        <Badge variant="warning">{row.daysLeft} day(s) left</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {row.jobTitle}
                      {row.department ? ` · ${row.department}` : ""}
                      {row.branch ? ` · ${row.branch}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {row.email}
                      {row.employeeCode ? ` · ${row.employeeCode}` : ""}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                      <span>
                        Last day: <span className="text-gray-600">{formatDate(row.endDate)}</span>
                      </span>
                      <span>
                        Deletes: <span className="text-gray-600">{formatDate(row.deleteAt)}</span>
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deletingId === row.id}
                    onClick={() => setConfirming(row)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <ArchiveRestore className="w-4 h-4 text-violet-600" />
          How this works
        </h3>
        <ul className="text-xs text-gray-500 space-y-1.5 mt-2 list-disc pl-5">
          <li>When you offboard a staff member (set them as inactive with an end date), they move into this list.</li>
          <li>
            They are kept for the retention days you set above (default 30), so reports and history stay intact for a
            grace period.
          </li>
          <li>
            Once that window passes, the record — including their account, attendance, leave and payroll — is
            permanently deleted from the database.
          </li>
        </ul>
      </div>

      <Dialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title="Delete permanently?"
        description={
          confirming
            ? `${fullName(confirming)} — ${confirming.email}.`
            : undefined
        }
        size="sm"
      >
        <p className="text-sm text-gray-600">
          This permanently deletes the staff record and ALL connected data{" "}
          <span className="font-medium text-gray-900">(account, attendance, leave and payroll)</span>. This cannot be
          undone.
        </p>
        <div className="mt-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Retention window
          </label>
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            {confirming ? `${confirming.daysLeft} day(s) remaining` : "—"} · last day {confirming ? formatDate(confirming.endDate) : "—"}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setConfirming(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deletingId === confirming?.id} onClick={deleteNow}>
            <Trash2 className="w-4 h-4" />
            Delete permanently
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
