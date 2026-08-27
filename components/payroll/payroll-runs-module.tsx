"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Plus,
  Upload,
} from "lucide-react";
import { Button, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";

type PayrollRunRow = {
  id: string;
  label: string | null;
  periodStart: Date | string;
  periodEnd: Date | string;
  status: string;
  employeeCount: number;
  totalNet: number;
  totalGross: number;
  createdByName: string | null;
  createdAt: Date | string;
};

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

export function PayrollRunsModule({
  runs,
  canOperate,
  canExport,
}: {
  runs: PayrollRunRow[];
  canOperate: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const importRef = useRef<HTMLInputElement>(null);

  useAppEvents({
    types: ["payroll_updated"],
    onEvent: () => scheduleRouterRefresh(() => router.refresh()),
  });

  const [bulkOpen, setBulkOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    periodStart: "",
    periodEnd: "",
    label: "",
    status: "DRAFT",
  });

  const totals = useMemo(
    () => ({
      runs: runs.length,
      employees: runs.reduce((sum, run) => sum + run.employeeCount, 0),
      net: runs.reduce((sum, run) => sum + run.totalNet, 0),
    }),
    [runs]
  );

  const downloadExport = (format: string, runId?: string) => {
    const params = new URLSearchParams({ format });
    if (runId) params.set("runId", runId);
    window.open(`/api/payroll/export?${params.toString()}`, "_blank");
  };

  const generateBulk = async () => {
    if (!form.periodStart || !form.periodEnd) {
      notify.error("Period start and end are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to generate payroll run"));
        return;
      }
      const data = await res.json();
      notify.success(`Created ${data.created} payslip(s)${data.skipped ? ` · ${data.skipped} skipped` : ""}`);
      setBulkOpen(false);
      router.refresh();
      if (data.run?.id) router.push(`/payroll/runs/${data.run.id}`);
    } catch {
      notify.error("Failed to generate payroll run");
    } finally {
      setLoading(false);
    }
  };

  const importCsv = async (file: File) => {
    setLoading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/payroll/import", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        notify.error(data.error ?? "Import failed");
        return;
      }
      notify.success(`Updated ${data.updated} record(s)`);
      if (data.errors?.length) notify.error(data.errors.slice(0, 3).join("; "));
      router.refresh();
    } catch {
      notify.error("Import failed");
    } finally {
      setLoading(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Payroll runs" value={totals.runs} icon={Layers} />
        <StatCard label="Payslips in runs" value={totals.employees} icon={Layers} />
        <StatCard label="Total net (runs)" value={formatCurrency(totals.net)} icon={Layers} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-brand-50/30 via-white to-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Group payroll runs</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Generate payslips for all active staff · export register · import CSV updates
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/payroll"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Individual payslips
            </Link>
            {canExport && (
              <>
                <Button variant="secondary" onClick={() => downloadExport("csv")}>
                  <Download className="w-4 h-4" />
                  CSV
                </Button>
                <Button variant="secondary" onClick={() => downloadExport("xlsx")}>
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </Button>
                <Button variant="secondary" onClick={() => downloadExport("pdf")}>
                  <FileText className="w-4 h-4" />
                  PDF
                </Button>
              </>
            )}
            {canOperate && (
              <>
                <input
                  ref={importRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importCsv(file);
                  }}
                />
                <Button variant="secondary" onClick={() => importRef.current?.click()}>
                  <Upload className="w-4 h-4" />
                  Import CSV
                </Button>
                <Button onClick={() => setBulkOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Generate for all
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="p-5">
          {runs.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No payroll runs yet"
              description="Generate a group run to create payslips for every active employee at once."
            />
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <article
                  key={run.id}
                  className="rounded-xl border border-gray-100 p-4 hover:border-brand-200 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <Link
                        href={`/payroll/runs/${run.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-brand-600"
                      >
                        {run.label ??
                          `${formatDate(run.periodStart)} – ${formatDate(run.periodEnd)}`}
                      </Link>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {run.employeeCount} employee(s) · Net {formatCurrency(run.totalNet)}
                      </p>
                      {run.createdByName && (
                        <p className="text-xs text-gray-400 mt-1">By {run.createdByName}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(run.status)}
                      <Link
                        href={`/payroll/runs/${run.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100"
                      >
                        Open register
                      </Link>
                      {canExport && (
                        <button
                          type="button"
                          onClick={() => downloadExport("csv", run.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-brand-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} title="Generate group payroll" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Period start</label>
              <input
                type="date"
                className={inputClass}
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Period end</label>
              <input
                type="date"
                className={inputClass}
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Label (optional)</label>
            <input
              className={inputClass}
              placeholder="e.g. August 2026 payroll"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="DRAFT">Draft</option>
              <option value="PROCESSED">Processed</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Creates one payslip per active employee with pro-rata salary and pending deductions applied.
            Employees with an existing payslip for the same period are skipped.
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setBulkOpen(false)}>
            Cancel
          </Button>
          <Button loading={loading} onClick={generateBulk}>
            Generate for all
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function PayrollRunDetailModule({
  run,
  canOperate,
  canExport,
}: {
  run: PayrollRunRow & {
    records: Array<{
      id: string;
      netPay: number;
      grossPay: number;
      status: string;
      employee: { id: string; firstName: string; lastName: string; employeeCode: string };
    }>;
  };
  canOperate: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const [loading, setLoading] = useState(false);

  useAppEvents({
    types: ["payroll_updated"],
    onEvent: () => scheduleRouterRefresh(() => router.refresh()),
  });

  const setRunStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update run"));
        return;
      }
      notify.success(`Run marked as ${status.toLowerCase()}`);
      router.refresh();
    } catch {
      notify.error("Failed to update run");
    } finally {
      setLoading(false);
    }
  };

  const downloadExport = (format: string) => {
    window.open(`/api/payroll/export?format=${format}&runId=${run.id}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">
              {run.label ?? "Payroll run"}
            </h2>
            {statusBadge(run.status)}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {formatDate(run.periodStart)} – {formatDate(run.periodEnd)} · {run.employeeCount}{" "}
            employee(s)
          </p>
          <p className="text-sm font-medium text-emerald-600 mt-2">
            Total net {formatCurrency(run.totalNet)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/payroll/runs"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Back to runs
          </Link>
          {canExport && (
            <>
              <Button variant="secondary" onClick={() => downloadExport("csv")}>
                CSV
              </Button>
              <Button variant="secondary" onClick={() => downloadExport("xlsx")}>
                Excel
              </Button>
              <Button variant="secondary" onClick={() => downloadExport("pdf")}>
                PDF
              </Button>
            </>
          )}
          {canOperate && run.status !== "PAID" && (
            <>
              <Button variant="secondary" loading={loading} onClick={() => setRunStatus("PROCESSED")}>
                Mark processed
              </Button>
              <Button loading={loading} onClick={() => setRunStatus("PAID")}>
                Mark paid
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Register</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Gross</th>
                <th className="px-5 py-3">Net</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {run.records.map((record) => (
                <tr key={record.id} className="border-b border-gray-50 hover:bg-brand-50/20">
                  <td className="px-5 py-3 font-mono text-xs">{record.employee.employeeCode}</td>
                  <td className="px-5 py-3">
                    {record.employee.firstName} {record.employee.lastName}
                  </td>
                  <td className="px-5 py-3">{formatCurrency(record.grossPay)}</td>
                  <td className="px-5 py-3 font-semibold text-emerald-600">
                    {formatCurrency(record.netPay)}
                  </td>
                  <td className="px-5 py-3">{statusBadge(record.status)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/payroll/${record.id}`}
                      className="text-brand-600 hover:text-brand-700 font-medium"
                    >
                      {canOperate ? "View / edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
