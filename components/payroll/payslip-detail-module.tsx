"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Download,
  ExternalLink,
  Info,
  Minus,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button, statusBadge } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { useCurrency, useFormatCurrency } from "@/components/providers/currency-provider";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import type { PayrollLineItem } from "@/lib/payroll-types";
import {
  categoryTag,
  payslipNumber,
  payslipTotals,
} from "@/lib/payslip-template";
import type { PayslipViewerContext } from "@/lib/payslip-viewer";
import { payslipStatusNotice } from "@/lib/payslip-viewer";
import { roleLabel } from "@/lib/roles";

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
  paidAt?: Date | string | null;
  createdAt?: Date | string | null;
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
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

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

function LineAmount({
  item,
  editing,
  onChange,
}: {
  item: PayrollLineItem;
  editing: boolean;
  onChange: (amount: number) => void;
}) {
  const formatCurrency = useFormatCurrency();
  if (editing) {
    return (
      <input
        type="number"
        min="0"
        step="0.01"
        className={`${inputClass} text-right max-w-[120px] ml-auto`}
        value={item.amount}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    );
  }

  return (
    <span
      className={`font-bold tabular-nums ${
        item.type === "EARNING" ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {item.type === "DEDUCTION" ? "−" : "+"}
      {formatCurrency(item.amount)}
    </span>
  );
}

function BreakdownSection({
  title,
  rows,
  empty,
  editing,
  onUpdate,
  onRemove,
  onAdd,
  addButtons,
}: {
  title: string;
  rows: PayrollLineItem[];
  empty: string;
  editing: boolean;
  onUpdate: (id: string, patch: Partial<PayrollLineItem>) => void;
  onRemove: (id: string) => void;
  onAdd?: () => void;
  addButtons?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-violet-600">{title}</h3>
        {editing && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add line
          </button>
        )}
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-wide text-gray-400 w-10">
                #
              </th>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Description
              </th>
              <th className="text-right py-2.5 px-4 text-[10px] font-bold uppercase tracking-wide text-gray-400 w-36">
                Amount
              </th>
              {editing && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={editing ? 4 : 3} className="py-8 text-center text-gray-400 text-sm">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <td className="py-3 px-4 text-xs text-gray-400 font-mono">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="py-3 px-4">
                    {editing ? (
                      <input
                        className={inputClass}
                        value={item.label}
                        onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                      />
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {categoryTag(item.category)}
                          {item.auto && " · Auto-calculated"}
                        </p>
                      </>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <LineAmount
                      item={item}
                      editing={editing}
                      onChange={(amount) => onUpdate(item.id, { amount })}
                    />
                  </td>
                  {editing && (
                    <td className="py-3 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
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
      {editing && addButtons && <div className="flex flex-wrap gap-2 mt-3">{addButtons}</div>}
    </section>
  );
}

export function PayslipDetailModule({
  record,
  breakdown: initialBreakdown,
  canManage,
  viewer,
  companyName = "Smart HR",
}: {
  record: PayslipRecord;
  breakdown: PayrollLineItem[];
  canManage: boolean;
  viewer: PayslipViewerContext;
  companyName?: string;
}) {
  const router = useRouter();
  useAppEvents({
    types: ["payroll_updated"],
    onEvent: () => scheduleRouterRefresh(() => router.refresh()),
  });
  const formatCurrency = useFormatCurrency();
  const { currency } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(initialBreakdown);
  const [notes, setNotes] = useState(record.notes ?? "");
  const [status, setStatus] = useState(record.status);
  const [loading, setLoading] = useState(false);

  const { earnings, deductions, grossPay, totalDeductions, netPay } = payslipTotals(items);
  const invoiceNo = payslipNumber(record.id);
  const issueDate = record.paidAt ?? record.createdAt ?? new Date();

  const updateItem = (id: string, patch: Partial<PayrollLineItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const recalculate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recalculate: true }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to recalculate"));
        return;
      }
      notify.success("Payslip recalculated from attendance");
      router.refresh();
    } catch {
      notify.error("Failed to recalculate");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakdown: items, notes, status }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save payslip"));
        return;
      }
      notify.success("Payslip updated");
      setEditing(false);
      router.refresh();
    } catch {
      notify.error("Failed to save payslip");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => window.print();
  const statusNotice = payslipStatusNotice(status, viewer);
  const employeeName = fullName(record.employee.firstName, record.employee.lastName);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Role context banner */}
      <div className="print:hidden mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
          {viewer.isPayrollAdmin ? (
            <Shield className="w-3.5 h-3.5 text-violet-600" />
          ) : (
            <UserRound className="w-3.5 h-3.5 text-violet-600" />
          )}
          <span>
            Viewing as <strong className="text-gray-900">{roleLabel(viewer.role)}</strong>
            {!viewer.isOwnPayslip && (
              <>
                {" "}
                · <strong className="text-gray-900">{employeeName}</strong>
              </>
            )}
          </span>
        </div>
        {viewer.showEmployeeProfileLink && (
          <Link
            href={`/employees/${record.employee.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700"
          >
            View employee profile
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Toolbar — hidden when printing */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href="/payroll"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-4 h-4" />
          {viewer.backLabel}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={printReceipt}>
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <a href={`/api/payroll/${record.id}/payslip`} download>
            <Button variant="secondary">
              <Download className="w-4 h-4" />
              {viewer.downloadLabel}
            </Button>
          </a>
          {canManage && !editing && (
            <>
              <Button variant="secondary" loading={loading} onClick={recalculate}>
                <RefreshCw className="w-4 h-4" />
                Recalculate
              </Button>
              <Button onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4" />
                {viewer.isPayrollAdmin ? "Edit record" : "Edit breakdown"}
              </Button>
            </>
          )}
          {canManage && editing && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(false);
                  setItems(initialBreakdown);
                  setNotes(record.notes ?? "");
                  setStatus(record.status);
                }}
              >
                Cancel
              </Button>
              <Button loading={loading} onClick={save}>
                <Save className="w-4 h-4" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Receipt / Invoice document */}
      <article
        id="payslip-receipt"
        className="bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden print:shadow-none print:border print:rounded-none print:max-w-none"
      >
        <div className="h-1.5 bg-gradient-to-r from-brand-500 via-violet-600 to-indigo-600" />

        {statusNotice && (
          <div className="print:hidden mx-6 sm:mx-8 md:mx-10 mt-6 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <p>{statusNotice}</p>
          </div>
        )}

        <div className="p-6 sm:p-8 md:p-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
            <div>
              <p className="text-2xl font-extrabold text-brand-600 tracking-tight">{companyName}</p>
              <p className="text-sm text-gray-500 mt-1">{viewer.receiptKind}</p>
              <p className="text-xs text-gray-400 mt-1">{viewer.documentSubtitle}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                {viewer.isPayrollAdmin && !viewer.isOwnPayslip ? "Payroll invoice" : "Payslip"}
              </p>
              <p className="text-xl font-extrabold text-gray-900 mt-1 font-mono">{invoiceNo}</p>
              <div className="mt-3">{statusBadge(status)}</div>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Pay period", value: `${formatDate(record.periodStart)} – ${formatDate(record.periodEnd)}` },
              { label: "Issue date", value: formatDate(issueDate) },
              { label: "Employee ID", value: record.employee.employeeCode },
              { label: "Department", value: record.employee.department.name },
            ].map((field) => (
              <div key={field.label} className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{field.label}</p>
                <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{field.value}</p>
              </div>
            ))}
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-3">
                <Building2 className="w-3.5 h-3.5" />
                From (Employer)
              </div>
              <p className="font-bold text-gray-900">{companyName}</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Payroll &amp; Compensation
                <br />
                Smart HR Payroll System
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-3">
                <UserRound className="w-3.5 h-3.5" />
                {viewer.isOwnPayslip ? "Pay to (You)" : "Pay to (Employee)"}
              </div>
              <p className="font-bold text-gray-900">
                {viewer.isOwnPayslip ? viewer.payeeLabel : employeeName}
              </p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {record.employee.jobTitle}
                <br />
                ID: {record.employee.employeeCode}
              </p>
            </div>
          </div>

          {/* Breakdown tables */}
          <div className="space-y-6 mb-8">
            <BreakdownSection
              title="Earnings"
              rows={earnings}
              empty="No earnings on this payslip"
              editing={editing}
              onUpdate={updateItem}
              onRemove={removeItem}
              onAdd={editing ? () => setItems((prev) => [...prev, newLine("EARNING", "OVERTIME")]) : undefined}
            />
            <BreakdownSection
              title="Deductions"
              rows={deductions}
              empty="No deductions on this payslip"
              editing={editing}
              onUpdate={updateItem}
              onRemove={removeItem}
              addButtons={
                editing ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setItems((prev) => [...prev, newLine("DEDUCTION", "DAMAGE")])}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Damage
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setItems((prev) => [...prev, newLine("DEDUCTION", "OTHER")])}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Other
                    </Button>
                  </>
                ) : undefined
              }
            />
          </div>

          {/* Totals — invoice summary */}
          <div className="flex justify-end mb-6">
            <div className="w-full sm:w-80 rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 text-sm">
                <span className="text-gray-600">Gross earnings</span>
                <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(grossPay)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Minus className="w-3 h-3 text-red-400" />
                  Total deductions
                </span>
                <span className="font-bold text-red-600 tabular-nums">−{formatCurrency(totalDeductions)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-4 bg-gradient-to-r from-emerald-50 to-green-50">
                <span className="font-bold text-emerald-800">Net pay</span>
                <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                  {formatCurrency(netPay)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(editing || notes) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 mb-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">Notes</p>
              {editing ? (
                <textarea
                  className={`${inputClass} min-h-[72px] bg-white`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment notes, reference, or internal remarks"
                />
              ) : (
                <p className="text-sm text-amber-900/80 leading-relaxed">{notes}</p>
              )}
            </div>
          )}

          {editing && canManage && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 mb-6 print:hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mb-2">
                {viewer.isPayrollAdmin ? "Admin controls" : "Manager controls"}
              </p>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Payment status
              </label>
              <select
                className={`${inputClass} mt-2 max-w-xs bg-white`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="DRAFT">Draft</option>
                <option value="PROCESSED">Processed</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-dashed border-gray-200 text-center">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Computer-generated payslip · All amounts in {currency.code} · Retain for your records
              <br />
              <span className="font-mono text-gray-500">{invoiceNo}</span>
              {" · "}
              {formatDate(new Date())}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
