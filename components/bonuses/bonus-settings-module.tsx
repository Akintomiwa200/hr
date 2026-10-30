"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  GitBranch,
  Layers,
  Lock,
  Percent,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui";
import { APP_CURRENCIES } from "@/lib/currency";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  BONUS_APPROVER_OPTIONS,
  BONUS_PAYOUT_SCHEDULES,
  EMPLOYMENT_TYPE_OPTIONS,
  type BonusSettingsData,
  type BonusTypeView,
} from "@/lib/bonuses/types";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";

const labelClass = "block text-[12px] font-medium text-gray-700";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/30",
          checked ? "bg-violet-600" : "bg-gray-200"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  tone = "violet",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "violet" | "emerald" | "amber" | "sky";
}) {
  const tones = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3 border-b border-gray-50 px-5 py-4">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-gray-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
      )}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

export function BonusSettingsModule({
  initialSettings,
  types,
  departments,
  branches,
}: {
  initialSettings: BonusSettingsData;
  types: BonusTypeView[];
  departments: { id: string; name: string }[];
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<BonusSettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof BonusSettingsData>(key: K, value: BonusSettingsData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateEligibility<K extends keyof BonusSettingsData["eligibility"]>(
    key: K,
    value: BonusSettingsData["eligibility"][K]
  ) {
    setForm((prev) => ({
      ...prev,
      eligibility: { ...prev.eligibility, [key]: value },
    }));
  }

  function toggleList(
    key: "employmentTypes" | "departmentIds" | "branchIds",
    value: string
  ) {
    setForm((prev) => {
      const current = prev.eligibility[key];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, eligibility: { ...prev.eligibility, [key]: next } };
    });
  }

  async function save(settingsToSave: BonusSettingsData = form) {
    setSaving(true);
    try {
      const res = await fetch("/api/bonuses/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsToSave),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not save bonus settings"));
        return;
      }
      const data = (await res.json()) as { settings: BonusSettingsData };
      setForm(data.settings);
      notify.success(
        data.settings.enabled ? "Bonuses activated" : "Bonus settings saved",
        data.settings.enabled
          ? "The Bonuses module is now available under Employees."
          : "The module is hidden from the sidebar until it is activated."
      );
      router.refresh();
    } catch {
      notify.error("Could not save bonus settings");
    } finally {
      setSaving(false);
    }
  }

  const activeTypes = types.filter((type) => type.isActive);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-100/40 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">Bonuses & incentives</h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    form.enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      form.enabled ? "bg-emerald-500" : "bg-gray-400"
                    )}
                  />
                  {form.enabled ? "Active" : "Not activated"}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-gray-600">
                Activate the module once, then configure every rule your company needs — plans,
                eligibility, caps, approval flow and payout timing.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant={form.enabled ? "secondary" : "primary"}
              onClick={() => {
                const nextSettings = { ...form, enabled: !form.enabled };
                update("enabled", nextSettings.enabled);
                void save(nextSettings);
              }}
              loading={saving}
            >
              {form.enabled ? "Deactivate module" : "Activate bonuses"}
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          icon={Wallet}
          title="General"
          description="Currency, payroll label and the default plan used when creating awards."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="bonus-currency">
                Currency
              </label>
              <select
                id="bonus-currency"
                className={cn(inputClass, "mt-1.5")}
                value={form.currency}
                onChange={(event) => update("currency", event.target.value)}
              >
                {APP_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="bonus-schedule">
                Default payout timing
              </label>
              <select
                id="bonus-schedule"
                className={cn(inputClass, "mt-1.5")}
                value={form.payoutSchedule}
                onChange={(event) => update("payoutSchedule", event.target.value)}
              >
                {BONUS_PAYOUT_SCHEDULES.map((schedule) => (
                  <option key={schedule.value} value={schedule.value}>
                    {schedule.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="bonus-label">
                Payroll line label
              </label>
              <input
                id="bonus-label"
                className={cn(inputClass, "mt-1.5")}
                value={form.payrollLineLabel}
                placeholder="Bonus"
                onChange={(event) => update("payrollLineLabel", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="bonus-default-plan">
                Default plan
              </label>
              <select
                id="bonus-default-plan"
                className={cn(inputClass, "mt-1.5")}
                value={form.defaultTypeId ?? ""}
                onChange={(event) => update("defaultTypeId", event.target.value || null)}
              >
                <option value="">No default</option>
                {activeTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={ShieldCheck}
          title="Approval workflow"
          description="Control who reviews awards and when they become payable."
          tone="emerald"
        >
          <div className="divide-y divide-gray-50">
            <Toggle
              checked={form.approvalRequired}
              onChange={(value) => update("approvalRequired", value)}
              label="Require approval before payout"
              description="New awards start as pending and must be approved before they can be paid."
            />
            <div className="py-3">
              <label className={labelClass} htmlFor="bonus-approver">
                Approver role
              </label>
              <select
                id="bonus-approver"
                className={cn(inputClass, "mt-1.5")}
                value={form.approverRole}
                onChange={(event) => update("approverRole", event.target.value)}
              >
                {BONUS_APPROVER_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <Toggle
              checked={form.requireReason}
              onChange={(value) => update("requireReason", value)}
              label="Require a reason for each award"
            />
            <Toggle
              checked={form.notifyApprover}
              onChange={(value) => update("notifyApprover", value)}
              label="Notify approvers"
              description="Send an in-app notification when an award is submitted."
            />
            <Toggle
              checked={form.notifyEmployee}
              onChange={(value) => update("notifyEmployee", value)}
              label="Notify employees"
              description="Tell employees when their bonus is approved or paid."
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        icon={Users}
        title="Eligibility rules"
        description="Decide who can receive a bonus. Leave everything empty to allow all active employees."
        tone="sky"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="bonus-min-months">
                  Minimum service (months)
                </label>
                <input
                  id="bonus-min-months"
                  type="number"
                  min={0}
                  max={120}
                  className={cn(inputClass, "mt-1.5")}
                  value={form.minServiceMonths}
                  onChange={(event) =>
                    update("minServiceMonths", Number(event.target.value) || 0)
                  }
                />
              </div>
              <div className="flex flex-col justify-end gap-1 pb-1">
                <Toggle
                  checked={form.eligibility.activeOnly}
                  onChange={(value) => updateEligibility("activeOnly", value)}
                  label="Active employees only"
                />
                <Toggle
                  checked={form.eligibility.managerOnly}
                  onChange={(value) => updateEligibility("managerOnly", value)}
                  label="Require a line manager"
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Employment types</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    active={form.eligibility.employmentTypes.includes(option.value)}
                    onClick={() => toggleList("employmentTypes", option.value)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                No selection means every employment type is eligible.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className={cn(labelClass, "flex items-center gap-1.5")}>
                <Building2 className="h-3.5 w-3.5 text-gray-400" /> Departments
              </p>
              <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                {departments.length === 0 ? (
                  <p className="text-[12px] text-gray-400">No departments found.</p>
                ) : (
                  departments.map((department) => (
                    <Chip
                      key={department.id}
                      active={form.eligibility.departmentIds.includes(department.id)}
                      onClick={() => toggleList("departmentIds", department.id)}
                    >
                      {department.name}
                    </Chip>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className={cn(labelClass, "flex items-center gap-1.5")}>
                <GitBranch className="h-3.5 w-3.5 text-gray-400" /> Branches
              </p>
              <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                {branches.length === 0 ? (
                  <p className="text-[12px] text-gray-400">No branches found.</p>
                ) : (
                  branches.map((branch) => (
                    <Chip
                      key={branch.id}
                      active={form.eligibility.branchIds.includes(branch.id)}
                      onClick={() => toggleList("branchIds", branch.id)}
                    >
                      {branch.name}
                    </Chip>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          icon={Percent}
          title="Caps & guardrails"
          description="Protect payroll with company-wide limits on every award."
          tone="amber"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="bonus-max-amount">
                Maximum award amount
              </label>
              <input
                id="bonus-max-amount"
                type="number"
                min={0}
                className={cn(inputClass, "mt-1.5")}
                value={form.maxAwardAmount ?? ""}
                placeholder="No cap"
                onChange={(event) =>
                  update(
                    "maxAwardAmount",
                    event.target.value === "" ? null : Number(event.target.value)
                  )
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="bonus-max-percent">
                Maximum % of salary
              </label>
              <input
                id="bonus-max-percent"
                type="number"
                min={0}
                max={100}
                className={cn(inputClass, "mt-1.5")}
                value={form.maxPercentOfSalary ?? ""}
                placeholder="No cap"
                onChange={(event) =>
                  update(
                    "maxPercentOfSalary",
                    event.target.value === "" ? null : Number(event.target.value)
                  )
                }
              />
            </div>
          </div>
          <div className="mt-2 divide-y divide-gray-50">
            <Toggle
              checked={form.taxable}
              onChange={(value) => update("taxable", value)}
              label="Bonuses are taxable"
              description="New awards inherit this default, which can be overridden per plan."
            />
            <Toggle
              checked={form.prorateOnLeave}
              onChange={(value) => update("prorateOnLeave", value)}
              label="Prorate payouts for unpaid leave"
              description="Reduce bonuses proportionally when an employee has unpaid leave."
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={CircleDollarSign}
          title="Payroll & payouts"
          description="Choose how approved bonuses reach payroll."
        >
          <Toggle
            checked={form.autoApplyToPayroll}
            onChange={(value) => update("autoApplyToPayroll", value)}
            label="Auto-apply approved awards to payroll"
            description="Approved awards can be picked up by the next payroll run for the employee."
          />
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-800">
              <Lock className="h-3.5 w-3.5" /> Guardrails already active
            </p>
            <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-amber-700">
              <li>• Paid awards cannot be edited or deleted.</li>
              <li>• Employee eligibility is checked when an award is created.</li>
              <li>• Company caps are enforced before saving.</li>
            </ul>
          </div>

          <div className="mt-4">
            <p className={cn(labelClass, "flex items-center gap-1.5")}>
              <CalendarClock className="h-3.5 w-3.5 text-gray-400" /> Payout lifecycle
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
              {["Draft", "Pending", "Approved", "Scheduled", "Paid"].map((step, index) => (
                <span key={step} className="inline-flex items-center gap-1.5">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                    {step}
                  </span>
                  {index < 4 ? <ChevronRight className="h-3 w-3 text-gray-300" /> : null}
                </span>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">Bonus plans</h2>
              <p className="mt-0.5 text-[12px] text-gray-500">
                {activeTypes.length} active plan{activeTypes.length === 1 ? "" : "s"} · create
                unlimited plans with their own calculation method and caps.
              </p>
            </div>
          </div>
          <Link
            href="/bonuses/plans"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] font-medium text-violet-700 transition-colors hover:bg-violet-100"
          >
            Manage plans <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {types.slice(0, 6).map((type) => (
            <div
              key={type.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-gray-800">{type.name}</p>
                <p className="text-[11px] text-gray-400">
                  {type.calculationMethod === "FIXED"
                    ? `${form.currency} ${type.defaultAmount.toLocaleString()}`
                    : `${type.percentage}% · ${type.calculationMethod.replaceAll("_", " ").toLowerCase()}`}
                </p>
              </div>
              <span
                className={cn(
                  "ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  type.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {type.isActive ? "Active" : "Off"}
              </span>
            </div>
          ))}
          {types.length === 0 ? (
            <p className="text-[12px] text-gray-400">No plans yet. Activate the module or create one.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
