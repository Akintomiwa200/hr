"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Info,
  Percent,
  UserRound,
} from "lucide-react";
import { checkBonusEligibility, monthsSince, resolveBonusAmount } from "@/lib/bonuses/calculation";
import {
  BONUS_CATEGORIES,
  BONUS_CALCULATION_METHODS,
  type BonusEmployeeOption,
  type BonusSettingsData,
  type BonusTypeView,
} from "@/lib/bonuses/types";
import { BonusMoney, BonusSection } from "@/components/bonuses/bonus-ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelClass = "block text-[12px] font-medium text-gray-700";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function BonusAwardForm({
  employees,
  types,
  settings,
}: {
  employees: BonusEmployeeOption[];
  types: BonusTypeView[];
  settings: BonusSettingsData;
}) {
  const router = useRouter();
  const activeTypes = types.filter((type) => type.isActive);
  const defaultType = activeTypes.find((type) => type.id === settings.defaultTypeId) ?? null;

  const [employeeId, setEmployeeId] = useState("");
  const [typeId, setTypeId] = useState(defaultType?.id ?? "");
  const [title, setTitle] = useState(defaultType?.name ?? "");
  const [category, setCategory] = useState(defaultType?.category ?? "PERFORMANCE");
  const [method, setMethod] = useState(defaultType?.calculationMethod ?? "MANUAL");
  const [manualAmount, setManualAmount] = useState("");
  const [awardDate, setAwardDate] = useState(todayInput());
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [submitForApproval, setSubmitForApproval] = useState(settings.approvalRequired);
  const [saving, setSaving] = useState(false);

  const employee = employees.find((item) => item.id === employeeId) ?? null;
  const type = activeTypes.find((item) => item.id === typeId) ?? null;

  const calculation = (() => {
    if (!type) {
      const amount = Number(manualAmount) || 0;
      return { amount, baseAmount: null as number | null, percentage: null as number | null };
    }
    const result = resolveBonusAmount({
      method,
      type,
      baseSalary: employee?.salary ?? 0,
      manualAmount: method === "MANUAL" || method === "TIERED" ? Number(manualAmount) || 0 : null,
    });
    return {
      amount: result.amount,
      baseAmount: result.baseAmount,
      percentage: result.percentage,
    };
  })();

  const eligibility = employee
    ? checkBonusEligibility({
        employee: {
          status: employee.status,
          hireDate: employee.hireDate,
          employmentType: employee.employmentType,
          departmentId: employee.departmentId,
          branchId: employee.branchId,
          managerId: employee.managerId,
        },
        settings,
        type,
      })
    : null;

  const warnings: string[] = [];
  if (settings.maxAwardAmount != null && settings.maxAwardAmount > 0 && calculation.amount > settings.maxAwardAmount) {
    warnings.push(`Amount exceeds the company cap of ${settings.maxAwardAmount.toLocaleString()}.`);
  }
  if (settings.maxPercentOfSalary != null && settings.maxPercentOfSalary > 0 && employee) {
    const cap = (employee.salary * settings.maxPercentOfSalary) / 100;
    if (calculation.amount > cap) {
      warnings.push(`Amount exceeds ${settings.maxPercentOfSalary}% of this employee's salary.`);
    }
  }
  if (type?.maxAmount != null && calculation.amount > type.maxAmount) {
    warnings.push(`Plan cap is ${type.maxAmount.toLocaleString()}; the award will be capped.`);
  }
  if (settings.requireReason && !reason.trim()) {
    warnings.push("A reason is required by your bonus settings.");
  }

  function onSelectType(nextId: string) {
    setTypeId(nextId);
    const next = activeTypes.find((item) => item.id === nextId);
    if (next) {
      setTitle(next.name);
      setCategory(next.category);
      setMethod(next.calculationMethod);
      if (next.calculationMethod === "FIXED") setManualAmount(String(next.defaultAmount || ""));
    }
  }

  async function submit() {
    if (!employeeId) {
      notify.error("Select an employee");
      return;
    }
    if (!(calculation.amount > 0)) {
      notify.error("Bonus amount must be greater than zero");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/bonuses/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          typeId: typeId || null,
          title: title.trim() || type?.name,
          category,
          calculationMethod: method,
          amount: calculation.amount,
          awardDate,
          periodStart: periodStart || null,
          periodEnd: periodEnd || null,
          reason: reason.trim(),
          description: description.trim(),
          notes: notes.trim(),
          status: submitForApproval ? "PENDING" : settings.approvalRequired ? "PENDING" : "APPROVED",
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not create award"));
        return;
      }
      const data = (await res.json()) as { award: { id: string } };
      notify.success(submitForApproval ? "Award submitted for approval" : "Bonus award created");
      router.push(`/bonuses/awards/${data.award.id}`);
      router.refresh();
    } catch {
      notify.error("Could not create award");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/bonuses/awards"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-violet-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to awards
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <BonusSection title="Who is this bonus for?" description="Pick the employee and the plan to apply.">
            <div className="space-y-4 px-5 py-4">
              <div>
                <label className={labelClass} htmlFor="award-employee">
                  Employee
                </label>
                <select
                  id="award-employee"
                  className={cn(inputClass, "mt-1.5")}
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                >
                  <option value="">Select an employee</option>
                  {employees.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.firstName} {item.lastName} — {item.employeeCode} ({item.department})
                    </option>
                  ))}
                </select>
              </div>

              {employee ? (
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-[12px] font-bold text-violet-700">
                    {employee.firstName.charAt(0)}
                    {employee.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="truncate text-[11.5px] text-gray-500">
                      {employee.jobTitle} · {employee.department} · {monthsSince(employee.hireDate)} months
                      of service
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10.5px] uppercase tracking-wide text-gray-400">Salary</p>
                    <p className="text-[12.5px] font-semibold text-gray-800">
                      <BonusMoney amount={employee.salary} currency={settings.currency} />
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="award-plan">
                    Bonus plan
                  </label>
                  <select
                    id="award-plan"
                    className={cn(inputClass, "mt-1.5")}
                    value={typeId}
                    onChange={(event) => onSelectType(event.target.value)}
                  >
                    <option value="">Manual award (no plan)</option>
                    {activeTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="award-category">
                    Category
                  </label>
                  <select
                    id="award-category"
                    className={cn(inputClass, "mt-1.5")}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
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
                <label className={labelClass} htmlFor="award-title">
                  Award title
                </label>
                <input
                  id="award-title"
                  className={cn(inputClass, "mt-1.5")}
                  value={title}
                  placeholder="e.g. Q3 performance bonus"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
            </div>
          </BonusSection>

          <BonusSection
            title="How is it calculated?"
            description="Choose a calculation method or enter a one-off amount."
          >
            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="award-method">
                    Calculation method
                  </label>
                  <select
                    id="award-method"
                    className={cn(inputClass, "mt-1.5")}
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                  >
                    {BONUS_CALCULATION_METHODS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="award-amount">
                    Amount
                  </label>
                  <input
                    id="award-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    className={cn(inputClass, "mt-1.5")}
                    value={
                      method === "FIXED" && type
                        ? String(type.defaultAmount)
                        : calculation.amount || ""
                    }
                    readOnly={method === "FIXED" && Boolean(type)}
                    onChange={(event) => setManualAmount(event.target.value)}
                    placeholder="0.00"
                  />
                  {method === "FIXED" && type ? (
                    <p className="mt-1 text-[11px] text-gray-400">
                      Fixed by the {type.name} plan. Edit the plan to change it.
                    </p>
                  ) : null}
                </div>
              </div>

              {calculation.baseAmount != null ? (
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-[12px] text-violet-800">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Percent className="h-3.5 w-3.5" />
                    {calculation.percentage}% of{" "}
                    <BonusMoney amount={calculation.baseAmount} currency={settings.currency} />
                  </p>
                  <p className="mt-0.5 text-violet-600">
                    Resolves to{" "}
                    <strong>
                      <BonusMoney amount={calculation.amount} currency={settings.currency} />
                    </strong>
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass} htmlFor="award-date">
                    Award date
                  </label>
                  <input
                    id="award-date"
                    type="date"
                    className={cn(inputClass, "mt-1.5")}
                    value={awardDate}
                    onChange={(event) => setAwardDate(event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="award-period-start">
                    Period start
                  </label>
                  <input
                    id="award-period-start"
                    type="date"
                    className={cn(inputClass, "mt-1.5")}
                    value={periodStart}
                    onChange={(event) => setPeriodStart(event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="award-period-end">
                    Period end
                  </label>
                  <input
                    id="award-period-end"
                    type="date"
                    className={cn(inputClass, "mt-1.5")}
                    value={periodEnd}
                    onChange={(event) => setPeriodEnd(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </BonusSection>

          <BonusSection title="Justification" description="Give context for the approver and the employee.">
            <div className="space-y-4 px-5 py-4">
              <div>
                <label className={labelClass} htmlFor="award-reason">
                  Reason {settings.requireReason ? <span className="text-red-500">*</span> : null}
                </label>
                <textarea
                  id="award-reason"
                  rows={3}
                  className={cn(inputClass, "mt-1.5 resize-none")}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why is this bonus being awarded?"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="award-description">
                    Description
                  </label>
                  <textarea
                    id="award-description"
                    rows={2}
                    className={cn(inputClass, "mt-1.5 resize-none")}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="award-notes">
                    Internal notes
                  </label>
                  <textarea
                    id="award-notes"
                    rows={2}
                    className={cn(inputClass, "mt-1.5 resize-none")}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Only visible to admins"
                  />
                </div>
              </div>
            </div>
          </BonusSection>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-600 to-fuchsia-600 p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-violet-100">
              <BadgeDollarSign className="h-4 w-4" /> Award summary
            </div>
            <p className="mt-3 text-3xl font-bold">
              <BonusMoney amount={calculation.amount} currency={settings.currency} />
            </p>
            <p className="mt-1 text-[12.5px] text-violet-100">
              {employee ? `${employee.firstName} ${employee.lastName}` : "No employee selected"}
            </p>
            <div className="mt-4 space-y-1.5 text-[12px] text-violet-50">
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {awardDate || "No award date"}
              </p>
              <p className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" /> {type?.name ?? "Manual award"}
              </p>
            </div>
          </div>

          {eligibility ? (
            <div
              className={cn(
                "rounded-2xl border p-4",
                eligibility.eligible
                  ? "border-emerald-100 bg-emerald-50/60"
                  : "border-red-100 bg-red-50/60"
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-1.5 text-[12.5px] font-semibold",
                  eligibility.eligible ? "text-emerald-800" : "text-red-700"
                )}
              >
                {eligibility.eligible ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {eligibility.eligible ? "Eligible for this bonus" : "Not eligible"}
              </p>
              <p
                className={cn(
                  "mt-1 text-[11.5px] leading-relaxed",
                  eligibility.eligible ? "text-emerald-700" : "text-red-600"
                )}
              >
                {eligibility.eligible
                  ? "This employee meets the eligibility rules configured in bonus settings."
                  : eligibility.reason}
              </p>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" /> Before you save
              </p>
              <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-amber-700">
                {warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={submitForApproval}
                disabled={!settings.approvalRequired}
                onChange={(event) => setSubmitForApproval(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span>
                <span className="block text-[12.5px] font-medium text-gray-900">
                  Submit for approval
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-gray-500">
                  {settings.approvalRequired
                    ? `Awards are reviewed by ${settings.approverRole.replaceAll("_", " ").toLowerCase()} before payout.`
                    : "Approval is disabled, so new awards are approved immediately."}
                </span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving || !employeeId || (eligibility ? !eligibility.eligible : false)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : submitForApproval ? "Submit award" : "Create award"}
            </button>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              Company caps and eligibility rules are checked again when the award is saved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
