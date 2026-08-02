"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Download,
  Eye,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button, Card, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { PayrollSettingsPanel } from "@/components/payroll/payroll-settings-panel";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
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
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

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
  const [error, setError] = useState("");

  const loadPreview = async () => {
    setLoading(true);
    setError("");
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to preview");
      setPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to preview");
    } finally {
      setLoading(false);
    }
  };

  const createPayroll = async () => {
    setLoading(true);
    setError("");
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setCreateOpen(false);
      setPreview(null);
      router.refresh();
      router.push(`/payroll/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteRecord) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/${deleteRecord.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteRecord(null);
      router.refresh();
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
          <StatCard label="Total Payroll" value={formatCurrency(stats.total)} icon={DollarSign} />
          <StatCard label="Records" value={stats.count} icon={DollarSign} />
          <StatCard label="Average Net Pay" value={formatCurrency(stats.avg)} icon={DollarSign} />
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 mb-4">
        {canManageSettings && settings && <PayrollSettingsPanel settings={settings} />}
        {canManage && (
          <Button
            onClick={() => {
              setCreateOpen(true);
              setPreview(null);
              setError("");
            }}
          >
            <Plus className="w-4 h-4" />
            Process payroll
          </Button>
        )}
      </div>

      <Card>
        {records.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No payroll records"
            description="Process payroll to create payslips with automatic deductions."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {showEmployeeColumn && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Employee
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Gross
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Net pay
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    {showEmployeeColumn && (
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/employees/${record.employee.id}/payroll`}
                          className="hover:text-violet-600"
                        >
                          {fullName(record.employee.firstName, record.employee.lastName)}
                        </Link>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(record.periodStart)} – {formatDate(record.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatCurrency(record.grossPay || record.baseSalary + record.bonus)}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(record.netPay)}</td>
                    <td className="px-4 py-3">{statusBadge(record.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/payroll/${record.id}`}
                          className="p-2 text-gray-400 hover:text-violet-600 rounded-lg"
                          title="View breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a
                          href={`/api/payroll/${record.id}/payslip`}
                          download
                          className="p-2 text-gray-400 hover:text-violet-600 rounded-lg"
                          title="Download payslip"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {canManage && (
                          <>
                            <Link
                              href={`/payroll/${record.id}`}
                              className="p-2 text-gray-400 hover:text-violet-600 rounded-lg"
                              title="Edit breakdown"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
          {error && <p className="text-sm text-red-600">{error}</p>}
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
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              className={inputClass}
              value={form.periodStart}
              onChange={(e) => {
                setForm({ ...form, periodStart: e.target.value });
                setPreview(null);
              }}
            />
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
          <div className="grid grid-cols-3 gap-3">
            <input
              className={inputClass}
              placeholder="Base salary"
              value={form.baseSalary}
              onChange={(e) => {
                setForm({ ...form, baseSalary: e.target.value });
                setPreview(null);
              }}
            />
            <input
              className={inputClass}
              placeholder="Bonus"
              value={form.bonus}
              onChange={(e) => {
                setForm({ ...form, bonus: e.target.value });
                setPreview(null);
              }}
            />
            <input
              className={inputClass}
              placeholder="Damage deduction"
              value={form.damageAmount}
              onChange={(e) => {
                setForm({ ...form, damageAmount: e.target.value });
                setPreview(null);
              }}
            />
          </div>
          <select
            className={inputClass}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="DRAFT">Draft</option>
            <option value="PROCESSED">Processed</option>
            <option value="PAID">Paid</option>
          </select>

          {preview && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 text-sm">
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
