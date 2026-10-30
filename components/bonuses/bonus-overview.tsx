import Link from "next/link";
import {
  ArrowUpRight,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  Settings2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { BonusAwardView, BonusStats, BonusTypeView } from "@/lib/bonuses/types";
import { BonusSection, BonusStatusBadge, formatBonusDate } from "@/components/bonuses/bonus-ui";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
  tone: "violet" | "emerald" | "amber" | "sky";
}) {
  const tones = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-gray-500">{hint}</p>
    </div>
  );
}

export function BonusOverview({
  stats,
  awards,
  types,
  currency,
  canManage,
  canApprove,
  seesOnlyOwn,
  payoutSchedule,
  approvalRequired,
  approverRole,
}: {
  stats: BonusStats;
  awards: BonusAwardView[];
  types: BonusTypeView[];
  currency: string;
  canManage: boolean;
  canApprove: boolean;
  seesOnlyOwn: boolean;
  payoutSchedule: string;
  approvalRequired: boolean;
  approverRole: string;
}) {
  const recent = awards.slice(0, 6);
  const activeTypes = types.filter((type) => type.isActive);
  const scheduleLabel =
    payoutSchedule === "MANUAL"
      ? "Paid when approved"
      : payoutSchedule === "NEXT_PAYROLL"
        ? "Next payroll run"
        : `${payoutSchedule.charAt(0)}${payoutSchedule.slice(1).toLowerCase()}`;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-sm sm:p-6">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-100">
              <BadgeDollarSign className="h-4 w-4" />
              {seesOnlyOwn ? "Your bonuses" : "Bonus programme"}
            </p>
            <h2 className="mt-1.5 text-xl font-semibold">
              {seesOnlyOwn
                ? `${formatCurrency(stats.paidValue, currency)} paid to you`
                : `${formatCurrency(stats.paidValue, currency)} paid out`}
            </h2>
            <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-violet-100">
              {seesOnlyOwn
                ? "Track awards, approvals and payouts. Your bonuses appear here as soon as they are approved."
                : `${stats.pending} award${stats.pending === 1 ? "" : "s"} awaiting approval · ${
                    activeTypes.length
                  } active plan${activeTypes.length === 1 ? "" : "s"} · ${scheduleLabel.toLowerCase()}.`}
            </p>
          </div>
          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/bonuses/awards/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[12.5px] font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-50"
              >
                <Plus className="h-4 w-4" /> New award
              </Link>
              <Link
                href="/bonuses/settings"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3.5 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-white/20"
              >
                <Settings2 className="h-4 w-4" /> Settings
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={seesOnlyOwn ? "Your awards" : "Total awards"}
          value={String(stats.total)}
          hint={`${stats.draft} draft · ${stats.pending} pending`}
          icon={BadgeDollarSign}
          tone="violet"
        />
        <Stat
          label="Awaiting approval"
          value={formatCurrency(stats.pendingValue, currency)}
          hint={`${stats.pending} award${stats.pending === 1 ? "" : "s"} in review`}
          icon={Clock}
          tone="amber"
        />
        <Stat
          label="Approved value"
          value={formatCurrency(stats.approvedValue, currency)}
          hint={`${stats.approved} ready for payout`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <Stat
          label={seesOnlyOwn ? "Paid to you" : "Employees awarded"}
          value={seesOnlyOwn ? formatCurrency(stats.paidValue, currency) : String(stats.employeesCovered)}
          hint={seesOnlyOwn ? `${stats.paid} payout${stats.paid === 1 ? "" : "s"}` : `${stats.paid} paid awards`}
          icon={seesOnlyOwn ? Wallet : Users}
          tone="sky"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <BonusSection
          title="Recent awards"
          description={seesOnlyOwn ? "Your latest bonus activity." : "The latest bonuses across the company."}
          action={
            <Link
              href="/bonuses/awards"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-violet-600 hover:text-violet-700"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                <BadgeDollarSign className="h-5 w-5" />
              </div>
              <p className="mt-2 text-[13px] font-medium text-gray-800">No awards yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[12px] text-gray-500">
                {canManage
                  ? "Create a bonus plan and award your first bonus."
                  : "Awards made to you will show up here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map((award) => (
                <Link
                  key={award.id}
                  href={`/bonuses/awards/${award.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                    {award.employeeName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part.charAt(0))
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-900">{award.title}</p>
                    <p className="truncate text-[11.5px] text-gray-500">
                      {seesOnlyOwn ? award.typeName ?? "Bonus" : award.employeeName} ·{" "}
                      {formatBonusDate(award.awardDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12.5px] font-semibold text-gray-900">
                      {formatCurrency(award.amount, award.currency || currency)}
                    </p>
                    <div className="mt-0.5">
                      <BonusStatusBadge status={award.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </BonusSection>

        <div className="space-y-4">
          <BonusSection
            title="Programme settings"
            description="Rules currently applied to new awards."
          >
            <div className="space-y-2.5 px-5 py-4 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <CalendarClock className="h-3.5 w-3.5" /> Payout
                </span>
                <span className="font-medium text-gray-800">{scheduleLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approval
                </span>
                <span className="font-medium text-gray-800">
                  {approvalRequired
                    ? `Required · ${approverRole.replaceAll("_", " ").toLowerCase()}`
                    : "Automatic"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Layers className="h-3.5 w-3.5" /> Active plans
                </span>
                <span className="font-medium text-gray-800">{activeTypes.length}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <TrendingUp className="h-3.5 w-3.5" /> Paid rate
                </span>
                <span className="font-medium text-gray-800">
                  {stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </BonusSection>

          <BonusSection
            title="Plans"
            description="Calculation methods available to award."
            action={
              canManage ? (
                <Link
                  href="/bonuses/plans"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-violet-600 hover:text-violet-700"
                >
                  Manage <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              ) : null
            }
          >
            {activeTypes.length === 0 ? (
              <p className="px-5 py-6 text-center text-[12px] text-gray-500">
                No active plans yet.
              </p>
            ) : (
              <div className="space-y-1 px-3 py-2">
                {activeTypes.slice(0, 5).map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                  >
                    <span className="truncate text-[12px] font-medium text-gray-700">
                      {type.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {type.calculationMethod.startsWith("PERCENT")
                        ? `${type.percentage}%`
                        : type.calculationMethod === "FIXED"
                          ? formatCurrency(type.defaultAmount, currency)
                          : "Manual"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </BonusSection>

          {canApprove && stats.pending > 0 ? (
            <Link
              href="/bonuses/awards"
              className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 transition-colors hover:bg-amber-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-amber-900">
                  {stats.pending} award{stats.pending === 1 ? "" : "s"} need your approval
                </p>
                <p className="text-[11.5px] text-amber-700">
                  Review and approve to make them payable.
                </p>
              </div>
              <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-amber-700" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
