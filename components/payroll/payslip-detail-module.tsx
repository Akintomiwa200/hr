"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Button, Card, statusBadge } from "@/components/ui";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import type { PayrollLineItem } from "@/lib/payroll-types";

type PayslipRecord = {
  id: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  status: string;
  notes?: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    jobTitle: string;
    department: { name: string };
  };
};

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

function newLine(type: "EARNING" | "DEDUCTION", category: PayrollLineItem["category"]) {
  const labels: Record<string, string> = {
    OVERTIME: "Overtime pay",
    DAMAGE: "Damage deduction",
    OTHER: type === "EARNING" ? "Other earning" : "Other deduction",
  };
  return {
    id: `manual-${Date.now()}`,
    type,
    category,
    label: labels[category] ?? "Line item",
    amount: 0,
    auto: false,
    editable: true,
  } satisfies PayrollLineItem;
}

export function PayslipDetailModule({
  record,
  breakdown: initialBreakdown,
  canManage,
}: {
  record: PayslipRecord;
  breakdown: PayrollLineItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(initialBreakdown);
  const [notes, setNotes] = useState(record.notes ?? "");
  const [status, setStatus] = useState(record.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const earnings = items.filter((item) => item.type === "EARNING");
  const deductions = items.filter((item) => item.type === "DEDUCTION");
  const grossPay = earnings.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
  const netPay = grossPay - totalDeductions;

  const updateItem = (id: string, patch: Partial<PayrollLineItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const recalculate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/payroll/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recalculate: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to recalculate");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to recalculate");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/payroll/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakdown: items, notes, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const lineTable = (rows: PayrollLineItem[], empty: string) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Item</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
            {editing && <th className="w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={editing ? 3 : 2} className="py-4 text-gray-400 text-center">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((item) => (
              <tr key={item.id}>
                <td className="py-3">
                  {editing ? (
                    <input
                      className={inputClass}
                      value={item.label}
                      onChange={(e) => updateItem(item.id, { label: e.target.value })}
                    />
                  ) : (
                    <span className="text-gray-800">
                      {item.label}
                      {item.auto && (
                        <span className="ml-2 text-[11px] text-violet-600 font-medium">Auto</span>
                      )}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right font-semibold">
                  {editing ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${inputClass} text-right`}
                      value={item.amount}
                      onChange={(e) =>
                        updateItem(item.id, { amount: Number(e.target.value) || 0 })
                      }
                    />
                  ) : (
                    formatCurrency(item.amount)
                  )}
                </td>
                {editing && (
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href="/payroll"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to payroll
        </Link>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/payroll/${record.id}/payslip`} download>
            <Button variant="secondary">
              <Download className="w-4 h-4" />
              Download payslip
            </Button>
          </a>
          {canManage && !editing && (
            <>
              <Button variant="secondary" loading={loading} onClick={recalculate}>
                <RefreshCw className="w-4 h-4" />
                Recalculate auto
              </Button>
              <Button onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4" />
                Edit breakdown
              </Button>
            </>
          )}
          {canManage && editing && (
            <>
              <Button variant="secondary" onClick={() => { setEditing(false); setItems(initialBreakdown); }}>
                Cancel
              </Button>
              <Button loading={loading} onClick={save}>
                <Save className="w-4 h-4" />
                Save changes
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Payslip</p>
              <h2 className="text-xl font-bold text-gray-900 mt-1">
                {fullName(record.employee.firstName, record.employee.lastName)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {record.employee.jobTitle} · {record.employee.department.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">ID: {record.employee.employeeCode}</p>
            </div>
            <div className="text-right">
              {statusBadge(status)}
              <p className="text-sm text-gray-500 mt-2">
                {formatDate(record.periodStart)} – {formatDate(record.periodEnd)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-violet-50/60 border-violet-100 p-5">
          <p className="text-xs uppercase tracking-wide text-violet-700 font-semibold">Net pay</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(netPay)}</p>
          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Gross</span>
              <span className="font-medium">{formatCurrency(grossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span>Deductions</span>
              <span className="font-medium text-amber-700">{formatCurrency(totalDeductions)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Earnings</h3>
          {lineTable(earnings, "No earnings")}
          {editing && (
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => setItems((prev) => [...prev, newLine("EARNING", "OVERTIME")])}
            >
              <Plus className="w-4 h-4" />
              Add earning
            </Button>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Deductions</h3>
          {lineTable(deductions, "No deductions")}
          {editing && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant="secondary"
                onClick={() => setItems((prev) => [...prev, newLine("DEDUCTION", "DAMAGE")])}
              >
                <Plus className="w-4 h-4" />
                Add damage
              </Button>
              <Button
                variant="secondary"
                onClick={() => setItems((prev) => [...prev, newLine("DEDUCTION", "OTHER")])}
              >
                <Plus className="w-4 h-4" />
                Add deduction
              </Button>
            </div>
          )}
        </Card>
      </div>

      {(editing || notes) && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
          {editing ? (
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes on this payslip"
            />
          ) : (
            <p className="text-sm text-gray-600">{notes || "—"}</p>
          )}
          {editing && (
            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
              <select
                className={`${inputClass} mt-1`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="DRAFT">Draft</option>
                <option value="PROCESSED">Processed</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
