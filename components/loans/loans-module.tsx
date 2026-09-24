"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, HandCoins, Plus, XCircle } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, formatMonthLabel, fullName, cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { useAppEvents } from "@/hooks/use-app-events";
import { todayInputValue } from "@/lib/dates";

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
};

type LoanInstallment = {
  id: string;
  seq: number;
  month: string;
  amount: number;
  status: string;
  appliedPayrollId: string | null;
  paidAt: string | null;
};

type LoanRow = {
  id: string;
  employeeId: string;
  amount: number;
  interestRate: number;
  monthlyInstallment: number;
  tenureMonths: number;
  startMonth: string;
  totalRepayable: number;
  purpose: string | null;
  note: string | null;
  status: string;
  requestedByName: string;
  approvedByName: string | null;
  approvedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  employee: EmployeeOption;
  installments: LoanInstallment[];
};

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-blue-50 text-blue-700",
  REJECTED: "bg-red-50 text-red-600",
  CLOSED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const INSTALLMENT_STYLES: Record<string, string> = {
  SCHEDULED: "bg-gray-100 text-gray-600",
  PAID: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-500 line-through",
};

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function LoansModule({
  employees,
  canApprove,
  sessionEmployeeId,
}: {
  employees: EmployeeOption[];
  canApprove: boolean;
  sessionEmployeeId?: string | null;
}) {
  const formatCurrency = useFormatCurrency();
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [requestOpen, setRequestOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LoanRow | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const ownEmployee =
    employees.find((e) => e.id === sessionEmployeeId) ?? employees[0];

  const [form, setForm] = useState({
    employeeId: canApprove ? employees[0]?.id ?? "" : ownEmployee?.id ?? "",
    amount: "",
    interestRate: "",
    tenureMonths: "6",
    startMonth: todayInputValue().slice(0, 7),
    purpose: "",
    note: "",
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/loans?status=${statusFilter}`, {
        cache: "no-store",
      });
      if (res.ok) {
        setLoans(await res.json());
      } else {
        notify.error(await readApiError(res, "Failed to load loans"));
      }
    } catch {
      notify.error("Failed to load loans");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useAppEvents({
    types: ["loan_updated", "payroll_updated"],
    onEvent: () => {
      void load(true);
    },
  });

  const preview = useMemo(() => {
    const amount = Number(form.amount) || 0;
    const rate = Number(form.interestRate) || 0;
    const tenure = Number(form.tenureMonths) || 0;
    const total = amount > 0 ? amount * (1 + rate / 100) : 0;
    const monthly = tenure > 0 ? Math.round((total / tenure) * 100) / 100 : 0;
    return { total, monthly, valid: amount > 0 && tenure >= 1 && tenure <= 60 };
  }, [form.amount, form.interestRate, form.tenureMonths]);

  const stats = useMemo(() => {
    let outstanding = 0;
    let monthlyOutflow = 0;
    let pending = 0;
    let closed = 0;
    for (const loan of loans) {
      if (loan.status === "PENDING") pending += 1;
      if (loan.status === "CLOSED") closed += 1;
      if (loan.status !== "APPROVED") continue;
      monthlyOutflow += loan.monthlyInstallment;
      const paid = loan.installments
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + i.amount, 0);
      outstanding += loan.totalRepayable - paid;
    }
    return {
      outstanding,
      monthlyOutflow,
      pending,
      closed,
    };
  }, [loans]);

  const createLoanRequest = async () => {
    if (!preview.valid) return;
    if (canApprove && !form.employeeId) return;
    if (!form.startMonth) return;
    setCreating(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          amount: Number(form.amount),
          interestRate: Number(form.interestRate) || 0,
          tenureMonths: Number(form.tenureMonths),
          startMonth: form.startMonth,
          purpose: form.purpose.trim(),
          note: form.note.trim(),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to submit loan request"));
        return;
      }
      notify.success(
        canApprove ? "Loan created" : "Loan request sent for approval"
      );
      setRequestOpen(false);
      setForm((current) => ({
        ...current,
        amount: "",
        interestRate: "",
        purpose: "",
        note: "",
      }));
      void load(true);
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (
    id: string,
    action: "approve" | "reject" | "cancel",
    body: Record<string, unknown> = {}
  ) => {
    setActing(id);
    try {
      const res = await fetch(`/api/loans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Action failed"));
        return;
      }
      notify.success(
        action === "approve"
          ? "Loan approved — repayment plan created"
          : action === "reject"
            ? "Loan request rejected"
            : "Loan cancelled"
      );
      if (action === "reject") {
        setRejectTarget(null);
        setRejectNote("");
      }
      void load(true);
    } finally {
      setActing(null);
    }
  };

  const closeDialog = () => {
    setRejectTarget(null);
    setRejectNote("");
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-violet-50/40 border-violet-100">
        <p className="text-sm text-gray-700">
          Loans are approved here in real time. When a request is approved, a repayment plan is
          generated and each monthly installment is automatically pulled into that employee&apos;s
          payslip as a deduction until the loan is fully repaid.
        </p>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500">Outstanding balance</p>
          <p className="text-lg font-bold text-gray-900 tabular-nums mt-1">
            {formatCurrency(stats.outstanding)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500">Monthly deductions</p>
          <p className="text-lg font-bold text-gray-900 tabular-nums mt-1">
            {formatCurrency(stats.monthlyOutflow)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500">Awaiting approval</p>
          <p className="text-lg font-bold text-amber-600 tabular-nums mt-1">
            {stats.pending}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500">Fully repaid</p>
          <p className="text-lg font-bold text-emerald-600 tabular-nums mt-1">
            {stats.closed}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PENDING", "APPROVED", "CLOSED", "REJECTED", "CANCELLED"] as const).map(
            (status) => (
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
                {status === "ALL" ? "All" : statusLabel(status)}
              </button>
            )
          )}
        </div>
        <Button onClick={() => setRequestOpen(true)}>
          <Plus className="w-4 h-4" />
          {canApprove ? "Create loan" : "Request a loan"}
        </Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-gray-500">Loading loans…</Card>
      ) : loans.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No loans here"
          description={
            statusFilter === "ALL"
              ? "Submit a loan request and its repayment plan will show up here once approved."
              : `No ${statusLabel(statusFilter).toLowerCase()} loans in this view.`
          }
        />
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => {
            const paid = loan.installments.filter((i) => i.status === "PAID").length;
            const progress = loan.tenureMonths > 0 ? paid / loan.tenureMonths : 0;
            const expanded = expandedId === loan.id;
            const canCancel =
              (loan.status === "PENDING" || loan.status === "APPROVED") &&
              (canApprove || sessionEmployeeId === loan.employeeId);
            return (
              <Card key={loan.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[220px]">
                    <p className="font-semibold text-gray-900">
                      {fullName(loan.employee.firstName, loan.employee.lastName)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {loan.employee.employeeCode ? `${loan.employee.employeeCode} · ` : ""}
                      {loan.purpose?.trim() || "Staff loan"}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      {formatCurrency(loan.amount)} over {loan.tenureMonths} months ·{" "}
                      {formatCurrency(loan.monthlyInstallment)}/month
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Requested by {loan.requestedByName} · {formatDate(loan.createdAt)}
                      {loan.approvedByName
                        ? ` · Approved by ${loan.approvedByName}`
                        : ""}
                    </p>
                    {loan.decisionNote && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {loan.decisionNote}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span
                      className={cn(
                        "text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full",
                        STATUS_STYLES[loan.status] ?? "bg-gray-100 text-gray-500"
                      )}
                    >
                      {statusLabel(loan.status)}
                    </span>
                    {loan.status === "APPROVED" && (
                      <p className="text-[12px] text-gray-500">
                        {paid}/{loan.tenureMonths} installments paid
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      {loan.status === "PENDING" && canApprove && (
                        <>
                          <button
                            type="button"
                            disabled={acting === loan.id}
                            onClick={() => void runAction(loan.id, "approve")}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={acting === loan.id}
                            onClick={() => setRejectTarget(loan)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                      {loan.installments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : loan.id)}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          {expanded ? "Hide plan" : "Show plan"}
                        </button>
                      )}
                      {canCancel && (
                        <button
                          type="button"
                          disabled={acting === loan.id}
                          onClick={() => void runAction(loan.id, "cancel")}
                          className="text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {(expanded || loan.installments.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Repayment plan</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Starts {formatMonthLabel(loan.startMonth)} · each installment is
                          deducted from the payslip for its month
                        </p>
                      </div>
                      <div className="w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.round(progress * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {loan.installments.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-medium text-gray-500">
                              #{item.seq}
                            </span>
                            <span className="text-xs text-gray-700 truncate">
                              {formatMonthLabel(item.month)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-gray-800 tabular-nums">
                              {formatCurrency(item.amount)}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full",
                                INSTALLMENT_STYLES[item.status] ?? "bg-gray-100 text-gray-500"
                              )}
                            >
                              {item.status === "PAID"
                                ? "Paid"
                                : item.status === "CANCELLED"
                                  ? "Cancelled"
                                  : "Due"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title={canApprove ? "Create staff loan" : "Request a loan"}
        size="md"
      >
        <div className="space-y-4">
          {canApprove && (
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
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Loan amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="200000"
              />
            </div>
            <div>
              <label className={labelClass}>Interest rate (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tenure (months)</label>
              <input
                type="number"
                min="1"
                max="60"
                className={inputClass}
                value={form.tenureMonths}
                onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>First deduction month</label>
              <input
                type="month"
                className={inputClass}
                value={form.startMonth}
                onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
              />
            </div>
          </div>
          {preview.valid && (
            <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 text-sm text-gray-700">
              Total repayable: <span className="font-semibold tabular-nums">{formatCurrency(preview.total)}</span> ·
              Monthly installment: <span className="font-semibold tabular-nums">{formatCurrency(preview.monthly)}</span>
            </div>
          )}
          <div>
            <label className={labelClass}>Purpose</label>
            <input
              className={inputClass}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="e.g. Emergency"
            />
          </div>
          <div>
            <label className={labelClass}>Note</label>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Optional details"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setRequestOpen(false)}>
            Cancel
          </Button>
          <Button loading={creating} onClick={() => void createLoanRequest()}>
            {canApprove ? "Create loan" : "Submit request"}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={rejectTarget != null}
        onClose={closeDialog}
        title="Reject loan request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Reject the {rejectTarget?.purpose?.trim() || "staff loan"} request for{" "}
            {rejectTarget
              ? fullName(rejectTarget.employee.firstName, rejectTarget.employee.lastName)
              : ""}{" "}
            of {rejectTarget ? formatCurrency(rejectTarget.amount) : ""}?
          </p>
          <div>
            <label className={labelClass}>Reason (optional)</label>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Why this was declined"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={closeDialog}>
            Keep request
          </Button>
          <Button
            variant="danger"
            loading={acting === rejectTarget?.id}
            onClick={() => void runAction(rejectTarget!.id, "reject", { decisionNote: rejectNote })}
          >
            Reject loan
          </Button>
        </div>
      </Dialog>
    </div>
  );
}