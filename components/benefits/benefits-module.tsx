"use client";

import Link from "next/link";
import {
  HeartPulse,
  PiggyBank,
  BriefcaseBusiness,
  GraduationCap,
  HandCoins,
  Gift,
  Wallet,
  ShieldCheck,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Benefit = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  accent?: string;
};

const benefits: Benefit[] = [
  {
    id: "medical",
    title: "Medical & health cover",
    description:
      "Private health insurance with outpatient, inpatient and dental coverage for staff and dependents.",
    icon: HeartPulse,
    href: "/documents",
  },
  {
    id: "leave",
    title: "Paid time off",
    description:
      "Annual leave, sick days and public holiday allocations managed right from your Leave module.",
    icon: CalendarDays,
    href: "/leave",
  },
  {
    id: "loans",
    title: "Staff loans",
    description:
      "Interest-free and low-interest salary advances repaid in monthly installments from payroll.",
    icon: HandCoins,
    href: "/loans",
  },
  {
    id: "pension",
    title: "Pension & savings",
    description: "Retirement contributions and voluntary savings plans with employer matching.",
    icon: PiggyBank,
    href: "/payroll",
  },
  {
    id: "bonus",
    title: "Performance bonus",
    description: "Quarterly and annual performance rewards linked to appraisal outcomes.",
    icon: Gift,
    href: "/performance",
  },
  {
    id: "professional",
    title: "Training & development",
    description:
      "Sponsored certifications, training and tuition support to grow within the company.",
    icon: GraduationCap,
    href: "/performance",
  },
  {
    id: "family",
    title: "Family & care support",
    description: "Maternity, paternity and caregiving benefits plus emergency family support.",
    icon: ShieldCheck,
  },
  {
    id: "salary",
    title: "13th month & allowances",
    description: "Predictable bonus allowances, transport and lunch perks paid with payroll.",
    icon: Wallet,
    href: "/payroll",
  },
  {
    id: "transfer",
    title: "Internal mobility",
    description: "Priority access to internal roles, transfers and cross-team rotations.",
    icon: BriefcaseBusiness,
    href: "/recruitment",
  },
];

export function BenefitsModule() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {benefits.map((benefit) => {
        const Icon = benefit.icon;
        const inner = (
          <>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  "bg-violet-50 text-violet-600"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-[14px] font-semibold text-gray-900">{benefit.title}</h3>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-gray-500">
              {benefit.description}
            </p>
          </>
        );

        const className = cn(
          "rounded-xl border border-gray-100 bg-white p-5 transition-colors",
          benefit.href
            ? "hover:border-violet-200 hover:shadow-sm hover:bg-violet-50/20"
            : "opacity-90"
        );

        return benefit.href ? (
          <Link
            key={benefit.id}
            href={benefit.href}
            className={className}
          >
            {inner}
          </Link>
        ) : (
          <div key={benefit.id} className={className}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}