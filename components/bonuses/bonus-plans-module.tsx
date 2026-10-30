"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  Layers,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import {
  BONUS_BASES,
  BONUS_CALCULATION_METHODS,
  BONUS_CATEGORIES,
  bonusCalculationLabel,
  bonusCategoryLabel,
  type BonusTypeView,
} from "@/lib/bonuses/types";
import { BonusMoney } from "@/components/bonuses/bonus-ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelClass = "block text-[12px] font-medium text-gray-700";

type PlanForm = {
  id?: string;
  name: string;
  code: string;
  description: string;
  category: string;
  calculationMethod: string;
  defaultAmount: string;
  percentage: string;
  base: string;
  maxAmount: string;
  minServiceMonths: string;
  taxable: boolean;
  requiresApproval: boolean;
  isActive: boolean;
};

function emptyForm(): PlanForm {
  return {
    name: "",
    code: "",
    description: "",
    category: "PERFORMANCE",
    calculationMethod: "FIXED",
    defaultAmount: "0",
    percentage: "0",
    base: "BASE_SALARY",
    maxAmount: "",
    minServiceMonths: "0",
    taxable: true,
    requiresApproval: true,
    isActive: true,
  };
}

function toForm(plan: BonusTypeView): PlanForm {
  return {
    id: plan.id,
    name: plan.name,
    code: plan.code ?? "",
    description: plan.description ?? "",
    category: plan.category,
    calculationMethod: plan.calculationMethod,
    defaultAmount: String(plan.defaultAmount),
    percentage: String(plan.percentage),
    base: plan.base,
    maxAmount: plan.maxAmount == null ? "" : String(plan.maxAmount),
    minServiceMonths: String(plan.minServiceMonths),
    taxable: plan.taxable,
    requiresApproval: plan.requiresApproval,
    isActive: plan.isActive,
  };
}

export function BonusPlansModule({
  initialTypes,
  currency,
}: {
  initialTypes: BonusTypeView[];
  currency: string;
}) {
  const router = useRouter();
  const [types, setTypes] = useState(initialTypes);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm());
  const [busy, setBusy] = useState(false);

  function startCreate() {
    setForm(emptyForm());
    setOpen(true);
  }

  function startEdit(plan: BonusTypeView) {
    setForm(toForm(plan));
    setOpen(true);
  }

  async function refresh() {
    const res = await fetch("/api/bonuses/plans", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { types: BonusTypeView[] };
      setTypes(data.types);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      notify.error("Plan name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        category: form.category,
        calculationMethod: form.calculationMethod,
        defaultAmount: Number(form.defaultAmount) || 0,
        percentage: Number(form.percentage) || 0,
        base: form.base,
        maxAmount: form.maxAmount === "" ? null : Number(form.maxAmount),
        minServiceMonths: Number(form.minServiceMonths) || 0,
        taxable: form.taxable,
        requiresApproval: form.requiresApproval,
        isActive: form.isActive,
      };
      const res = await fetch(form.id ? `/api/bonuses/plans/${form.id}` : "/api/bonuses/plans", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not save plan"));
        return;
      }
      notify.success(form.id ? "Plan updated" : "Plan created");
      setOpen(false);
      await refresh();
      router.refresh();
    } catch {
      notify.error("Could not save plan");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(plan: BonusTypeView) {
    setBusy(true);
    try {
      const res = await fetch(`/api/bonuses/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not update plan"));
        return;
      }
      notify.success(plan.isActive ? "Plan paused" : "Plan activated");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(plan: BonusTypeView) {
    if (!window.confirm(`Delete “${plan.name}”? Plans with awards are archived instead.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bonuses/plans/${plan.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not delete plan"));
        return;
      }
      const data = (await res.json()) as { archived?: boolean };
      notify.success(data.archived ? "Plan archived (it has awards)" : "Plan deleted");
      await refresh();
      router.refresh();
    } catch {
      notify.error("Could not delete plan");
    } finally {
      setBusy(false);
    }
  }

  const showFixed = form.calculationMethod === "FIXED" || form.calculationMethod === "TIERED";
  const showPercent = form.calculationMethod.startsWith("PERCENT");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-gray-500">
            {types.length} plan{types.length === 1 ? "" : "s"} ·{" "}
            {types.filter((type) => type.isActive).length} active
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" /> New plan
        </button>
      </div>

      {types.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-gray-900">No bonus plans yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-gray-500">
            Plans define how bonuses are calculated. Activate the module to seed common plans, or
            create your own.
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" /> Create a plan
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {types.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
                plan.isActive ? "border-gray-100" : "border-dashed border-gray-200 opacity-80"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <BadgeDollarSign className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[13.5px] font-semibold text-gray-900">
                      {plan.name}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {plan.code ? `${plan.code} · ` : ""}
                      {bonusCategoryLabel(plan.category)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    plan.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {plan.isActive ? "Active" : "Paused"}
                </span>
              </div>

              {plan.description ? (
                <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-gray-500">
                  {plan.description}
                </p>
              ) : null}

              <div className="mt-3 space-y-1.5 rounded-xl bg-gray-50/70 p-2.5 text-[11.5px] text-gray-600">
                <p className="flex justify-between gap-2">
                  <span className="text-gray-400">Method</span>
                  <span className="text-right font-medium text-gray-700">
                    {bonusCalculationLabel(plan.calculationMethod)}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-gray-400">Value</span>
                  <span className="text-right font-medium text-gray-700">
                    {plan.calculationMethod.startsWith("PERCENT")
                      ? `${plan.percentage}%`
                      : plan.calculationMethod === "MANUAL"
                        ? "Manual entry"
                        : plan.calculationMethod === "TIERED"
                          ? "Tier based"
                          : <BonusMoney amount={plan.defaultAmount} currency={currency} />}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-gray-400">Cap</span>
                  <span className="text-right font-medium text-gray-700">
                    {plan.maxAmount != null ? (
                      <BonusMoney amount={plan.maxAmount} currency={currency} />
                    ) : (
                      "No cap"
                    )}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-gray-400">Awarded</span>
                  <span className="text-right font-medium text-gray-700">
                    {plan.awardedCount ?? 0} award{(plan.awardedCount ?? 0) === 1 ? "" : "s"}
                  </span>
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => startEdit(plan)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11.5px] font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleActive(plan)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11.5px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Power className="h-3 w-3" /> {plan.isActive ? "Pause" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Delete ${plan.name}`}
                  onClick={() => void remove(plan)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3.5">
              <h2 className="text-sm font-semibold text-gray-900">
                {form.id ? "Edit bonus plan" : "New bonus plan"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div>
                  <label className={labelClass} htmlFor="plan-name">
                    Plan name
                  </label>
                  <input
                    id="plan-name"
                    className={cn(inputClass, "mt-1.5")}
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="e.g. Annual performance bonus"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="plan-code">
                    Code
                  </label>
                  <input
                    id="plan-code"
                    className={cn(inputClass, "mt-1.5")}
                    value={form.code}
                    onChange={(event) => setForm({ ...form, code: event.target.value })}
                    placeholder="PERF"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="plan-description">
                  Description
                </label>
                <textarea
                  id="plan-description"
                  rows={2}
                  className={cn(inputClass, "mt-1.5 resize-none")}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="plan-category">
                    Category
                  </label>
                  <select
                    id="plan-category"
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
                <div>
                  <label className={labelClass} htmlFor="plan-method">
                    Calculation method
                  </label>
                  <select
                    id="plan-method"
                    className={cn(inputClass, "mt-1.5")}
                    value={form.calculationMethod}
                    onChange={(event) =>
                      setForm({ ...form, calculationMethod: event.target.value })
                    }
                  >
                    {BONUS_CALCULATION_METHODS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {showFixed ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="plan-default-amount">
                      Default amount
                    </label>
                    <input
                      id="plan-default-amount"
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(inputClass, "mt-1.5")}
                      value={form.defaultAmount}
                      onChange={(event) =>
                        setForm({ ...form, defaultAmount: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="plan-cap">
                      Cap (optional)
                    </label>
                    <input
                      id="plan-cap"
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(inputClass, "mt-1.5")}
                      value={form.maxAmount}
                      placeholder="No cap"
                      onChange={(event) => setForm({ ...form, maxAmount: event.target.value })}
                    />
                  </div>
                </div>
              ) : null}

              {showPercent ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass} htmlFor="plan-percentage">
                      Percentage
                    </label>
                    <input
                      id="plan-percentage"
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(inputClass, "mt-1.5")}
                      value={form.percentage}
                      onChange={(event) => setForm({ ...form, percentage: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="plan-base">
                      Base
                    </label>
                    <select
                      id="plan-base"
                      className={cn(inputClass, "mt-1.5")}
                      value={form.base}
                      onChange={(event) => setForm({ ...form, base: event.target.value })}
                    >
                      {BONUS_BASES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="plan-percent-cap">
                      Cap (optional)
                    </label>
                    <input
                      id="plan-percent-cap"
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(inputClass, "mt-1.5")}
                      value={form.maxAmount}
                      placeholder="No cap"
                      onChange={(event) => setForm({ ...form, maxAmount: event.target.value })}
                    />
                  </div>
                </div>
              ) : null}

              {form.calculationMethod === "MANUAL" ? (
                <div>
                  <label className={labelClass} htmlFor="plan-manual-cap">
                    Cap (optional)
                  </label>
                  <input
                    id="plan-manual-cap"
                    type="number"
                    min={0}
                    step="0.01"
                    className={cn(inputClass, "mt-1.5")}
                    value={form.maxAmount}
                    placeholder="No cap"
                    onChange={(event) => setForm({ ...form, maxAmount: event.target.value })}
                  />
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="plan-min-months">
                    Minimum service (months)
                  </label>
                  <input
                    id="plan-min-months"
                    type="number"
                    min={0}
                    className={cn(inputClass, "mt-1.5")}
                    value={form.minServiceMonths}
                    onChange={(event) =>
                      setForm({ ...form, minServiceMonths: event.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  {[
                    { key: "isActive" as const, label: "Active" },
                    { key: "taxable" as const, label: "Taxable" },
                    { key: "requiresApproval" as const, label: "Requires approval" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-[12.5px] text-gray-700">
                      <input
                        type="checkbox"
                        checked={form[item.key]}
                        onChange={(event) =>
                          setForm({ ...form, [item.key]: event.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-5 py-3.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-200 px-3.5 py-2 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="rounded-xl bg-violet-600 px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {busy ? "Saving…" : form.id ? "Save changes" : "Create plan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
