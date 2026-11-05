"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { BenefitAccess, BenefitLive } from "@/lib/benefits-types";
import { cn } from "@/lib/utils";

type BenefitTone = "good" | "warn" | "neutral";

type BenefitAction = {
  label: string;
  href: string;
};

type BenefitCard = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  metric: string;
  metricLabel: string;
  hint: string;
  status: string;
  tone: BenefitTone;
  accent: string;
  actions: BenefitAction[];
};

const toneStyles: Record<BenefitTone, string> = {
  good: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warn: "bg-amber-50 text-amber-700 ring-amber-100",
  neutral: "bg-gray-50 text-gray-600 ring-gray-100",
};

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function BenefitsModule({
  live,
  access,
}: {
  live: BenefitLive;
  access: BenefitAccess;
}) {
  const fmt = (value: number) => formatMoney(value, live.currencyCode);

  const benefits: BenefitCard[] = [
    {
      id: "medical",
      title: "Medical & health cover",
      description:
        "Private health insurance documents, policy summaries and cover letters for staff and dependents.",
      icon: HeartPulse,
      href: "/documents",
      metric: `${live.medical.documentCount}`,
      metricLabel:
        live.medical.documentCount === 1
          ? "health document available"
          : "health documents available",
      hint: `${plural(live.medical.folderCount, "document folder")} · policies, cover letters & claims`,
      status:
        live.medical.documentCount > 0 ? "Cover documents ready" : "Available on request",
      tone: live.medical.documentCount > 0 ? "good" : "neutral",
      accent: "bg-rose-50 text-rose-600",
      actions: [
        { label: "Browse documents", href: "/documents" },
        ...(access.canManageDocuments
          ? [{ label: "Manage files", href: "/documents" }]
          : [{ label: "HR letters", href: "/letters" }]),
      ],
    },
    {
      id: "leave",
      title: "Paid time off",
      description:
        "Annual leave, sick days and public holiday allocations managed right from your Leave module.",
      icon: CalendarDays,
      href: "/leave",
      metric:
        live.leave.balance != null
          ? `${live.leave.balance}`
          : `${live.leave.annualDefaultDays}`,
      metricLabel:
        live.leave.balance != null ? "annual leave days left" : "default annual days",
      hint: `${live.leave.pending} pending · ${live.leave.approved} approved · ${
        live.leave.allocationEnabled ? "balances tracked" : "records only"
      }`,
      status: live.leave.allocationEnabled ? "Balance tracked" : "Request in Leave",
      tone: live.leave.allocationEnabled ? "good" : "neutral",
      accent: "bg-brand-50 text-brand-600",
      actions: [{ label: "Request time off", href: "/leave" }],
    },
    {
      id: "loans",
      title: "Staff loans",
      description:
        "Interest-free and low-interest salary advances repaid in monthly installments from payroll.",
      icon: HandCoins,
      href: "/loans",
      metric: fmt(live.loans.outstanding),
      metricLabel: "outstanding balance",
      hint: `${live.loans.pending} pending · ${live.loans.approved} active ${
        live.loans.approved === 1 ? "loan" : "loans"
      }`,
      status:
        live.loans.pending > 0 ? "Awaiting approval" : "No pending request",
      tone: live.loans.pending > 0 ? "warn" : "neutral",
      accent: "bg-amber-50 text-amber-600",
      actions: [{ label: "View loan account", href: "/loans" }],
    },
    {
      id: "pension",
      title: "Pension & savings",
      description:
        "Retirement and savings contributions deducted in payroll, with employer matching where offered.",
      icon: PiggyBank,
      href: "/payroll",
      metric: live.pension.configured ? fmt(live.pension.monthlyAmount) : "Not set up",
      metricLabel: live.pension.configured
        ? live.pension.label ?? "monthly contribution"
        : "no pension deduction found",
      hint: live.pension.configured
        ? "Deducted automatically when payroll runs"
        : "Ask payroll to add a pension or savings deduction",
      status: live.pension.configured ? "Deducted in payroll" : "Set up in Payroll",
      tone: live.pension.configured ? "good" : "neutral",
      accent: "bg-emerald-50 text-emerald-600",
      actions: [
        { label: "Open payroll", href: "/payroll" },
        ...(access.canManagePayroll
          ? [{ label: "Manage deductions", href: "/payroll/deductions" }]
          : []),
      ],
    },
    {
      id: "bonus",
      title: "Performance bonus",
      description:
        "Quarterly and annual performance rewards linked to appraisal outcomes and paid through payroll.",
      icon: Gift,
      href: "/bonuses",
      metric: live.bonuses.enabled ? fmt(live.bonuses.approvedValue) : "Module off",
      metricLabel: live.bonuses.enabled ? "approved bonus value" : "bonuses not enabled",
      hint: live.bonuses.enabled
        ? `${live.bonuses.pending} awaiting approval · ${fmt(live.bonuses.paidValue)} paid`
        : "HR can enable the Bonuses module in settings",
      status: live.bonuses.enabled
        ? live.bonuses.pending > 0
          ? "Approval in progress"
          : "Up to date"
        : "Not enabled",
      tone: live.bonuses.enabled
        ? live.bonuses.pending > 0
          ? "warn"
          : "good"
        : "neutral",
      accent: "bg-violet-50 text-violet-600",
      actions: [
        { label: "View bonuses", href: "/bonuses" },
        ...(access.canManageBonuses
          ? [{ label: "Bonus plans", href: "/bonuses/plans" }]
          : []),
      ],
    },
    {
      id: "professional",
      title: "Training & development",
      description:
        "Sponsored certifications, appraisals and growth plans that help you develop within the company.",
      icon: GraduationCap,
      href: "/training",
      metric: `${live.training.completedReviews}`,
      metricLabel:
        live.training.completedReviews === 1
          ? "completed review"
          : "completed reviews",
      hint: `${plural(live.training.activeCycles, "active review cycle")} · goals, KPIs & feedback`,
      status:
        live.training.activeCycles > 0 ? "Reviews in progress" : "Open performance",
      tone: live.training.activeCycles > 0 ? "warn" : "neutral",
      accent: "bg-sky-50 text-sky-600",
      actions: [
        { label: "Open training", href: "/training" },
        { label: "Appraisals", href: "/performance" },
        ...(access.canManagePerformance
          ? [{ label: "Manage appraisals", href: "/performance" }]
          : []),
      ],
    },
    {
      id: "family",
      title: "Family & care support",
      description:
        "Maternity, paternity and caregiving leave plus family policy documents when you need them.",
      icon: ShieldCheck,
      href: "/leave",
      metric: `${live.leave.familyApproved}`,
      metricLabel:
        live.leave.familyApproved === 1
          ? "family leave approved"
          : "family leave approved",
      hint: "Maternity, paternity & caregiving · apply through Leave",
      status:
        live.leave.familyApproved > 0 ? "Support used" : "Available when needed",
      tone: live.leave.familyApproved > 0 ? "good" : "neutral",
      accent: "bg-pink-50 text-pink-600",
      actions: [
        { label: "Family leave", href: "/leave" },
        { label: "Family policies", href: "/documents" },
      ],
    },
    {
      id: "salary",
      title: "13th month & allowances",
      description:
        "Predictable annual bonus allowances, transport and holiday perks paid with your payroll.",
      icon: Wallet,
      href: live.bonuses.enabled ? "/bonuses" : "/payroll",
      metric:
        live.bonuses.annualPlans > 0
          ? `${live.bonuses.annualPlans}`
          : live.bonuses.holidayAllowanceEnabled
            ? fmt(live.bonuses.holidayAllowanceAmount)
            : "Not set",
      metricLabel:
        live.bonuses.annualPlans > 0
          ? live.bonuses.annualPlans === 1
            ? "annual / 13th-month plan"
            : "annual / 13th-month plans"
          : live.bonuses.holidayAllowanceEnabled
            ? "holiday allowance per run"
            : "no annual plan or allowance",
      hint: live.bonuses.holidayAllowanceEnabled
        ? `Holiday allowance ${fmt(live.bonuses.holidayAllowanceAmount)} · paid with payroll`
        : "Set up annual bonuses or allowances in Payroll & Bonuses",
      status: live.bonuses.holidayAllowanceEnabled
        ? "Allowance active"
        : live.bonuses.annualPlans > 0
          ? "Annual plan ready"
          : "Not configured",
      tone:
        live.bonuses.holidayAllowanceEnabled || live.bonuses.annualPlans > 0
          ? "good"
          : "neutral",
      accent: "bg-indigo-50 text-indigo-600",
      actions: [
        ...(live.bonuses.enabled
          ? [{ label: "Annual bonuses", href: "/bonuses" }]
          : []),
        { label: "Payroll", href: "/payroll" },
      ],
    },
    {
      id: "transfer",
      title: "Internal mobility",
      description:
        "Priority access to internal roles, transfers and cross-team rotations across the company.",
      icon: BriefcaseBusiness,
      href: access.canManageRecruitment ? "/recruitment" : "/careers",
      metric: `${live.mobility.openRoles}`,
      metricLabel:
        live.mobility.openRoles === 1 ? "open internal role" : "open internal roles",
      hint: access.canManageRecruitment
        ? "Manage openings and internal applications"
        : "Browse open roles and apply from Careers",
      status:
        live.mobility.openRoles > 0 ? "Openings available" : "No open roles",
      tone: live.mobility.openRoles > 0 ? "good" : "neutral",
      accent: "bg-teal-50 text-teal-600",
      actions: [
        access.canManageRecruitment
          ? { label: "Recruitment", href: "/recruitment" }
          : { label: "Browse careers", href: "/careers" },
      ],
    },
  ];

  const employeeView = access.role === "EMPLOYEE" || access.role === "SUPERVISOR";
  const enabledBenefits = benefits.filter((benefit) => {
    switch (benefit.id) {
      case "loans":
      case "professional":
        return true;
      case "leave":
        return live.leave.allocationEnabled;
      case "medical":
        return live.medical.documentCount > 0;
      case "pension":
        return live.pension.configured;
      case "bonus":
        return live.bonuses.enabled;
      case "family":
        return live.leave.familyApproved > 0;
      case "salary":
        return live.bonuses.enabled && (live.bonuses.annualPlans > 0 || live.bonuses.holidayAllowanceEnabled);
      case "transfer":
        return live.mobility.openRoles > 0;
      default:
        return false;
    }
  });
  const visibleBenefits = employeeView
    ? enabledBenefits.filter((benefit) => {
        switch (benefit.id) {
          case "medical": return live.medical.documentCount > 0;
          case "pension": return live.pension.configured;
          case "bonus": return live.bonuses.enabled;
          case "professional": return true;
          case "salary": return live.bonuses.enabled && (live.bonuses.annualPlans > 0 || live.bonuses.holidayAllowanceEnabled);
          case "family":
          case "transfer": return false;
          default: return true;
        }
      })
    : enabledBenefits;

  const summary = [
    ...(live.leave.allocationEnabled ? [{
      label: "Annual leave balance",
      value:
        live.leave.balance != null
          ? `${live.leave.balance} days`
          : `${live.leave.annualDefaultDays} days`,
      hint: live.leave.allocationEnabled ? "tracked this year" : "default allowance",
    }] : []),
    {
      label: "Loan outstanding",
      value: fmt(live.loans.outstanding),
      hint: `${live.loans.approved} active ${live.loans.approved === 1 ? "loan" : "loans"}`,
    },
    {
      label: "Training & development",
      value: `${live.training.activeCycles}`,
      hint: live.training.activeCycles === 1 ? "active review cycle" : "active review cycles",
    },
    ...(live.bonuses.enabled ? [{
      label: "Bonus approved",
      value: live.bonuses.enabled ? fmt(live.bonuses.approvedValue) : "—",
      hint: live.bonuses.enabled
        ? `${live.bonuses.pending} pending approval`
        : "module not enabled",
    }] : []),
    ...(!employeeView && live.mobility.openRoles > 0 ? [{
      label: "Open internal roles",
      value: `${live.mobility.openRoles}`,
      hint: "internal mobility",
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-brand-50/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Live benefits snapshot</h2>
              <p className="text-xs text-gray-500">
                {employeeView ? "Your available programmes and personal balances." : "Pulled from Leave, Loans, Payroll, Bonuses and Recruitment in real time."}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
            Auto-updates
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
            >
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {item.label}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{item.value}</dd>
              <dd className="mt-0.5 text-[11px] text-gray-500">{item.hint}</dd>
            </div>
          ))}
        </dl>
      </section>

      {visibleBenefits.length === 0 ? <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">No additional benefit programmes are currently available to you.</div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleBenefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <article
              key={benefit.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-colors hover:border-violet-200 hover:shadow-sm"
            >
              <Link
                href={benefit.href}
                className="flex flex-1 flex-col p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        benefit.accent
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-[14px] font-semibold text-gray-900">
                      {benefit.title}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                      toneStyles[benefit.tone]
                    )}
                  >
                    {benefit.status}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50/80 px-3 py-2.5">
                  <p className="text-lg font-semibold leading-tight text-gray-900">
                    {benefit.metric}
                  </p>
                  <p className="text-[11px] text-gray-500">{benefit.metricLabel}</p>
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-gray-500">
                  {benefit.description}
                </p>
                <p className="mt-2 text-[11px] text-gray-400">{benefit.hint}</p>

                <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-violet-600 group-hover:text-violet-700">
                  Open module
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              {benefit.actions.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 bg-gray-50/40 px-5 py-2.5">
                  {benefit.actions.map((action) => (
                    <Link
                      key={`${benefit.id}-${action.label}`}
                      href={action.href}
                      className="text-[11px] font-medium text-gray-500 transition-colors hover:text-violet-600"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>}
    </div>
  );
}
