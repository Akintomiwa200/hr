"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Download,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { PayrollSettingsPanel } from "@/components/payroll/payroll-settings-panel";
import { notify, readApiError } from "@/lib/toast";
import { formatCurrency, formatDate, fullName, cn } from "@/lib/utils";
import type { PayrollLineItem, PayrollSettingsData } from "@/lib/payroll-types";

type PayrollRow = {
  id: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  status: string;
  employee: { id: string; firstName: string; lastName: string };
};

type EmployeeOption = { id: string; firstName: string; lastName: string; salary?: number };

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "PROCESSED", label: "Processed" },
  { id: "PAID", label: "Paid" },
] as const;

export function PayrollModule({
  records,
  employees,
  canManage,
  canManageSettings,
  showEmployeeColumn,
  stats,
  settings,
}: {
  records: PayrollRow[];
  employees: EmployeeOption[];
  canManage: boolean;
  canManageSettings: boolean;
  showEmployeeColumn: boolean;
  stats?: { total: number; count: number; avg: number };
  settings?: PayrollSettingsData;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<PayrollRow | null>(null);
  const [preview, setPreview] = useState<{
    items: PayrollLineItem[];
    summary: { grossPay: number; deductions: number; netPay: number };
    meta: { lateDays: number; absentDays: number };
  } | null>(null);
  const [form, setForm] = useState({
    employeeId: employees[0]?.id ?? "",
    periodStart: "",
    periodEnd: "",
    baseSalary: employees[0]?.salary?.toString() ?? "",
    bonus: "0",
    status: "DRAFT",
    damageAmount: "",
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredRecords = useMemo(() => {
    let list = records;
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      fullName(r.employee.firstName, r.employee.lastName).toLowerCase().includes(q)
    );
  }, [records, search, statusFilter]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const manualItems: PayrollLineItem[] = [];
      if (form.damageAmount && Number(form.damageAmount) > 0) {
        manualItems.push({
          id: "preview-damage",
          type: "DEDUCTION",
          category: "DAMAGE",
          label: "Damage deduction",
          amount: Number(form.damageAmount),
          auto: false,
          editable: true,
        });
      }

      const res = await fetch("/api/payroll/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          baseSalary: form.baseSalary,
          bonus: form.bonus,
          manualItems,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to preview payroll"));
        return;
      }
      const data = await res.json();
      setPreview(data);
    } catch {
      notify.error("Failed to preview payroll");
    } finally {
      setLoading(false);
    }
  };

  const createPayroll = async () => {
    setLoading(true);
    try {
      const manualItems: PayrollLineItem[] = [];
      if (form.damageAmount && Number(form.damageAmount) > 0) {
        manualItems.push({
          id: "create-damage",
          type: "DEDUCTION",
          category: "DAMAGE",
          label: "Damage deduction",
          amount: Number(form.damageAmount),
          auto: false,
          editable: true,
        });
      }

      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          breakdown: preview?.items,
          manualItems: preview ? undefined : manualItems,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create payslip"));
        return;
      }
      const data = await res.json();
      notify.success("Payslip created successfully");
      setCreateOpen(false);
      setPreview(null);
      router.refresh();
      router.push(`/payroll/${data.id}`);
    } catch {
      notify.error("Failed to create payslip");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteRecord) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/${deleteRecord.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete payroll record"));
        return;
      }
      notify.success("Payroll record deleted");
      setDeleteRecord(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete payroll record");
    } finally {
      setLoading(false);
    }
  };

  const onEmployeeChange = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setForm({
      ...form,
      employeeId,
      baseSalary: employee?.salary?.toString() ?? form.baseSalary,
    });
    setPreview(null);
  };

  return (
    <>
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total payroll" value={formatCurrency(stats.total)} icon={DollarSign} />
          <StatCard label="Payslips" value={stats.count} icon={DollarSign} />
          <StatCard label="Average net" value={formatCurrency(stats.avg)} icon={DollarSign} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-brand-50/30 via-white to-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Payslips</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Auto deductions from attendance · edit breakdown per payslip
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {showEmployeeColumn && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee..."
                  className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 w-full sm:w-48"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {canManageSettings && settings && <PayrollSettingsPanel settings={settings} />}
            {canManage && (
              <Button
                onClick={() => {
                  setCreateOpen(true);
                  setPreview(null);
                }}
              >
                <Plus className="w-4 h-4" />
                Process payroll
              </Button>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors",
                statusFilter === f.id
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {filteredRecords.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No payroll records"
              description="Process payroll to generate payslips with automatic attendance deductions."
            />
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <article
                  key={record.id}
                  className="rounded-xl border border-gray-100 p-4 hover:border-brand-200 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0">
                      {showEmployeeColumn && (
                        <Link
                          href={`/employees/${record.employee.id}/payroll`}
                          className="text-sm font-semibold text-gray-900 hover:text-brand-600"
                        >
                          {fullName(record.employee.firstName, record.employee.lastName)}
                        </Link>
                      )}
                      <p className={cn("text-sm text-gray-600", showEmployeeColumn && "mt-0.5")}>
                        {formatDate(record.periodStart)} – {formatDate(record.periodEnd)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">
                          Gross {formatCurrency(record.grossPay || record.baseSalary + record.bonus)}
                        </span>
                        <span className="text-lg font-bold text-emerald-600">
                          {formatCurrency(record.netPay)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(record.status)}
                      <Link
                        href={`/payroll/${record.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                      <a
                        href={`/api/payroll/${record.id}/payslip`}
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-brand-200"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                      {canManage && (
                        <>
                          <Link
                            href={`/payroll/${record.id}`}
                            className="p-2 text-gray-400 hover:text-brand-600 rounded-lg"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          {record.status !== "PAID" && (
                            <button
                              type="button"
                              onClick={() => setDeleteRecord(record)}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setPreview(null);
        }}
        title="Process payroll"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Employee</label>
            <select
              className={inputClass}
              value={form.employeeId}
              onChange={(e) => onEmployeeChange(e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {fullName(e.firstName, e.lastName)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Period start</label>
              <input
                type="date"
                className={inputClass}
                value={form.periodStart}
                onChange={(e) => {
                  setForm({ ...form, periodStart: e.target.value });
                  setPreview(null);
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Period end</label>
              <input
                type="date"
                className={inputClass}
                value={form.periodEnd}
                onChange={(e) => {
                  setForm({ ...form, periodEnd: e.target.value });
                  setPreview(null);
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Base salary</label>
              <input
                className={inputClass}
                value={form.baseSalary}
                onChange={(e) => {
                  setForm({ ...form, baseSalary: e.target.value });
                  setPreview(null);
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Bonus</label>
              <input
                className={inputClass}
                value={form.bonus}
                onChange={(e) => {
                  setForm({ ...form, bonus: e.target.value });
                  setPreview(null);
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Damage deduction</label>
              <input
                className={inputClass}
                placeholder="Optional"
                value={form.damageAmount}
                onChange={(e) => {
                  setForm({ ...form, damageAmount: e.target.value });
                  setPreview(null);
                }}
              />
            </div>
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

          {preview && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm">
              <p className="font-semibold text-gray-900 mb-2">Auto breakdown preview</p>
              <div className="space-y-1 text-gray-600">
                {preview.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.label}
                      {item.auto && (
                        <span className="ml-1 text-[11px] text-violet-600">(auto)</span>
                      )}
                    </span>
                    <span className={item.type === "DEDUCTION" ? "text-amber-700" : "text-emerald-700"}>
                      {item.type === "DEDUCTION" ? "-" : "+"}
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-violet-100 flex justify-between font-semibold">
                <span>Net pay</span>
                <span className="text-emerald-600">{formatCurrency(preview.summary.netPay)}</span>
              </div>
              {(preview.meta.lateDays > 0 || preview.meta.absentDays > 0) && (
                <p className="text-xs text-gray-500 mt-2">
                  Based on {preview.meta.lateDays} late and {preview.meta.absentDays} absent day(s).
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="secondary"
            onClick={() => {
              setCreateOpen(false);
              setPreview(null);
            }}
          >
            Cancel
          </Button>
          {!preview ? (
            <Button loading={loading} onClick={loadPreview}>
              Preview breakdown
            </Button>
          ) : (
            <Button loading={loading} onClick={createPayroll}>
              Create payslip
            </Button>
          )}
        </div>
      </Dialog>

      <Dialog open={!!deleteRecord} onClose={() => setDeleteRecord(null)} title="Delete payroll record">
        <p className="text-sm text-gray-600 mb-4">Delete this payroll record?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteRecord(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={remove}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
