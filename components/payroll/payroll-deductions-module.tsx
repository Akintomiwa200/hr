"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MinusCircle, Plus, Trash2 } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { useAppEvents } from "@/hooks/use-app-events";
import { todayInputValue } from "@/lib/dates";

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
};

type DeductionRow = {
  id: string;
  amount: number;
  reason: string;
  periodMonth: string | null;
  status: string;
  createdByName: string;
  createdAt: string;
  employee: EmployeeOption;
};

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

export function PayrollDeductionsModule({
  employees,
}: {
  employees: EmployeeOption[];
}) {
  const formatCurrency = useFormatCurrency();
  const [rows, setRows] = useState<DeductionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [form, setForm] = useState({
    employeeId: employees[0]?.id ?? "",
    amount: "",
    reason: "",
    periodMonth: todayInputValue().slice(0, 7),
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/payroll/deductions?status=${statusFilter}`, {
        cache: "no-store",
      });
      if (res.ok) {
        setRows(await res.json());
      } else {
        notify.error(await readApiError(res, "Failed to load deductions"));
      }
    } catch {
      notify.error("Failed to load deductions");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useAppEvents({
    types: ["payroll_updated"],
    onEvent: () => {
      void load(true);
    },
  });

  const createDeduction = async () => {
    if (!form.employeeId || !form.reason.trim() || !form.amount) return;
    setCreating(true);
    try {
      const res = await fetch("/api/payroll/deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          amount: Number(form.amount),
          reason: form.reason.trim(),
          periodMonth: form.periodMonth,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to add deduction"));
        return;
      }
      notify.success("Deduction added — it will apply on the next payroll run");
      setOpen(false);
      setForm((current) => ({ ...current, amount: "", reason: "" }));
      void load(true);
    } finally {
      setCreating(false);
    }
  };

  const cancelDeduction = async (id: string) => {
    const res = await fetch(`/api/payroll/deductions?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to cancel deduction"));
      return;
    }
    notify.success("Deduction cancelled");
    void load(true);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-violet-50/40 border-violet-100">
        <p className="text-sm text-gray-700">
          Add manual deductions here in real time. Lateness and pro-rated salary are calculated
          automatically when you process payroll. Pending deductions below are pulled into the next
          payslip for that employee.
        </p>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["PENDING", "APPLIED", "ALL"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                statusFilter === status
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add deduction
        </Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-gray-500">Loading deductions…</Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MinusCircle}
          title="No deductions"
          description="Manual deductions for loans, damages, or other adjustments appear here until applied to payroll."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[220px]">
                  <p className="font-semibold text-gray-900">
                    {fullName(row.employee.firstName, row.employee.lastName)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {row.employee.employeeCode ? `${row.employee.employeeCode} · ` : ""}
                    {row.periodMonth ? `Period ${row.periodMonth}` : "Any upcoming payroll"}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">{row.reason}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Added by {row.createdByName} · {formatDate(row.createdAt)}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="text-lg font-bold text-red-600 tabular-nums">
                    −{formatCurrency(row.amount)}
                  </p>
                  <span
                    className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      row.status === "PENDING"
                        ? "bg-amber-50 text-amber-700"
                        : row.status === "APPLIED"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {row.status.toLowerCase()}
                  </span>
                  {row.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => void cancelDeduction(row.id)}
                      className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Need to process salary?{" "}
        <Link href="/payroll" className="text-brand-600 hover:underline">
          Go to Payroll
        </Link>
      </p>

      <Dialog open={open} onClose={() => setOpen(false)} title="Add payroll deduction" size="md">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Employee</label>
            <select
              className={inputClass}
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {fullName(employee.firstName, employee.lastName)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="5000"
            />
          </div>
          <div>
            <label className={labelClass}>Pay period (month)</label>
            <input
              type="month"
              className={inputClass}
              value={form.periodMonth}
              onChange={(e) => setForm({ ...form, periodMonth: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Narration / reason</label>
            <textarea
              className={`${inputClass} min-h-[96px]`}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Loan repayment — March installment"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button loading={creating} onClick={() => void createDeduction()}>
            Save deduction
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
