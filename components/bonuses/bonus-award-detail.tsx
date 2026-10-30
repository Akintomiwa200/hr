"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileText,
  Pencil,
  Send,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import type { BonusAwardView } from "@/lib/bonuses/types";
import { BONUS_CATEGORIES, bonusCalculationLabel, bonusCategoryLabel } from "@/lib/bonuses/types";
import { BonusMoney, BonusStatusBadge, formatBonusDate } from "@/components/bonuses/bonus-ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelClass = "block text-[12px] font-medium text-gray-700";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-[12px] text-gray-500">{label}</span>
      <span className="text-right text-[12.5px] font-medium text-gray-800">{value}</span>
    </div>
  );
}

export function BonusAwardDetail({
  initialAward,
  canManage,
  canApprove,
  currentRole,
}: {
  initialAward: BonusAwardView;
  canManage: boolean;
  canApprove: boolean;
  currentRole: string;
}) {
  const router = useRouter();
  const [award, setAward] = useState(initialAward);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState({
    title: award.title,
    amount: String(award.amount),
    category: award.category,
    reason: award.reason ?? "",
    notes: award.notes ?? "",
  });

  async function patch(body: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/bonuses/awards/${award.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not update award"));
        return;
      }
      const data = (await res.json()) as { award: BonusAwardView };
      setAward(data.award);
      notify.success(success);
      setEditing(false);
      setRejecting(false);
      router.refresh();
    } catch {
      notify.error("Could not update award");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this award? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bonuses/awards/${award.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not delete award"));
        return;
      }
      notify.success("Award deleted");
      router.push("/bonuses/awards");
      router.refresh();
    } catch {
      notify.error("Could not delete award");
    } finally {
      setBusy(false);
    }
  }

  const isPending = award.status === "PENDING";
  const isApproved = award.status === "APPROVED" || award.status === "SCHEDULED";
  const isPaid = award.status === "PAID";
  const editable = canManage && !isPaid && award.status !== "REJECTED" && award.status !== "CANCELLED";
  const canSubmitForApproval = canManage && award.status === "DRAFT";

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/bonuses/awards"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-violet-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to awards
      </Link>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 border-b border-gray-50 bg-gradient-to-br from-violet-50/70 via-white to-white p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
              <CircleDollarSign className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">{award.title}</h1>
                <BonusStatusBadge status={award.status} />
              </div>
              <p className="mt-1 text-[13px] text-gray-600">
                {award.employeeName} · {award.employeeCode} · {award.employeeJobTitle}
              </p>
              <p className="mt-0.5 text-[12px] text-gray-400">
                {award.department} · {bonusCategoryLabel(award.category)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canSubmitForApproval ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void patch({ status: "PENDING" }, "Award submitted for approval")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-[12.5px] font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Submit for approval
              </button>
            ) : null}
            {isPending && canApprove ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void patch({ status: "APPROVED" }, "Award approved")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[12.5px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRejecting(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12.5px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </>
            ) : null}
            {isApproved && canManage ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void patch({ status: "PAID" }, "Award marked as paid")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-[12.5px] font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <CircleDollarSign className="h-3.5 w-3.5" /> Mark as paid
              </button>
            ) : null}
            {editable ? (
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            ) : null}
            {canManage && !isPaid ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12.5px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">
                Award amount
              </p>
              <p className="mt-1 text-3xl font-bold text-violet-900">
                <BonusMoney amount={award.amount} currency={award.currency} />
              </p>
              <p className="mt-1 text-[12px] text-violet-700">
                {bonusCalculationLabel(award.calculationMethod)}
                {award.baseAmount != null
                  ? ` · ${award.percentage}% of ${award.baseAmount.toLocaleString()}`
                  : ""}
              </p>
            </div>

            {editing ? (
              <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
                <div>
                  <label className={labelClass} htmlFor="edit-title">
                    Title
                  </label>
                  <input
                    id="edit-title"
                    className={cn(inputClass, "mt-1.5")}
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="edit-amount">
                      Amount
                    </label>
                    <input
                      id="edit-amount"
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(inputClass, "mt-1.5")}
                      value={form.amount}
                      onChange={(event) => setForm({ ...form, amount: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="edit-category">
                      Category
                    </label>
                    <select
                      id="edit-category"
                      className={cn(inputClass, "mt-1.5")}
                      value={form.category}
                      onChange={(event) => setForm({ ...form, category: event.target.value })}
                    >
                      {BONUS_CATEGORIES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="edit-reason">
                    Reason
                  </label>
                  <textarea
                    id="edit-reason"
                    rows={2}
                    className={cn(inputClass, "mt-1.5 resize-none")}
                    value={form.reason}
                    onChange={(event) => setForm({ ...form, reason: event.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="edit-notes">
                    Internal notes
                  </label>
                  <textarea
                    id="edit-notes"
                    rows={2}
                    className={cn(inputClass, "mt-1.5 resize-none")}
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void patch(
                        {
                          title: form.title.trim(),
                          amount: Number(form.amount),
                          category: form.category,
                          reason: form.reason.trim(),
                          notes: form.notes.trim(),
                        },
                        "Award updated"
                      )
                    }
                    className="rounded-xl bg-violet-600 px-3 py-2 text-[12.5px] font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
                <FileText className="h-4 w-4 text-gray-400" /> Details
              </h2>
              {award.description ? (
                <p className="mt-2 text-[12.5px] leading-relaxed text-gray-600">{award.description}</p>
              ) : null}
              <div className="mt-2 divide-y divide-gray-50">
                <Row label="Reason" value={award.reason || "—"} />
                <Row label="Plan" value={award.typeName ?? "Manual award"} />
                <Row label="Award date" value={formatBonusDate(award.awardDate)} />
                <Row
                  label="Period"
                  value={
                    award.periodStart || award.periodEnd
                      ? `${formatBonusDate(award.periodStart)} → ${formatBonusDate(award.periodEnd)}`
                      : "—"
                  }
                />
                {award.notes ? <Row label="Internal notes" value={award.notes} /> : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
                <Clock className="h-4 w-4 text-gray-400" /> Approval timeline
              </h2>
              <ol className="mt-3 space-y-3">
                <li className="flex gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                  <div>
                    <p className="text-[12px] font-medium text-gray-800">Award created</p>
                    <p className="text-[11px] text-gray-500">
                      {formatBonusDate(award.createdAt)}
                      {award.createdByName ? ` · ${award.createdByName}` : ""}
                    </p>
                  </div>
                </li>
                {award.approvedAt ? (
                  <li className="flex gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-[12px] font-medium text-gray-800">Approved</p>
                      <p className="text-[11px] text-gray-500">
                        {formatBonusDate(award.approvedAt)}
                        {award.approvedByName ? ` · ${award.approvedByName}` : ""}
                      </p>
                    </div>
                  </li>
                ) : null}
                {award.paidAt ? (
                  <li className="flex gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    <div>
                      <p className="text-[12px] font-medium text-gray-800">Paid</p>
                      <p className="text-[11px] text-gray-500">{formatBonusDate(award.paidAt)}</p>
                    </div>
                  </li>
                ) : null}
                {award.rejectionReason ? (
                  <li className="flex gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <div>
                      <p className="text-[12px] font-medium text-gray-800">Rejected</p>
                      <p className="text-[11px] text-gray-500">{award.rejectionReason}</p>
                    </div>
                  </li>
                ) : null}
              </ol>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
                <UserRound className="h-4 w-4 text-gray-400" /> Employee
              </h2>
              <div className="mt-2 divide-y divide-gray-50">
                <Row label="Name" value={award.employeeName} />
                <Row label="Code" value={award.employeeCode} />
                <Row label="Department" value={award.department} />
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                Viewing as {currentRole.replaceAll("_", " ").toLowerCase()}.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
                <CalendarDays className="h-4 w-4 text-gray-400" /> Payout
              </h2>
              <div className="mt-2 divide-y divide-gray-50">
                <Row label="Status" value={<BonusStatusBadge status={award.status} />} />
                <Row label="Paid on" value={formatBonusDate(award.paidAt)} />
                <Row
                  label="Payroll record"
                  value={award.payrollRecordId ? "Linked" : "Not linked yet"}
                />
              </div>
              {isApproved && canManage ? (
                <p className="mt-2 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] leading-relaxed text-violet-700">
                  This award is approved. Mark it paid once it has been included in payroll.
                </p>
              ) : null}
              {isPaid ? (
                <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] leading-relaxed text-emerald-700">
                  Paid awards are locked and cannot be edited or deleted.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {rejecting ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">Reject this award?</h3>
            <p className="mt-1 text-[12.5px] text-gray-500">
              {award.employeeName} — {award.title}
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={3}
              placeholder="Reason (shared with the employee)"
              className="mt-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void patch(
                    {
                      status: "REJECTED",
                      rejectionReason: rejectReason.trim() || undefined,
                    },
                    "Award rejected"
                  )
                }
                className="rounded-xl bg-red-600 px-3 py-2 text-[12.5px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject award
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
