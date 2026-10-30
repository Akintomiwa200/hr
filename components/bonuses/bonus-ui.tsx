"use client";

import { cn } from "@/lib/utils";
import { badgeToneClass, bonusStatusMeta } from "@/lib/bonuses/types";

export function BonusStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = bonusStatusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        badgeToneClass(meta.tone),
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}

export function BonusMoney({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "NGN",
    maximumFractionDigits: 2,
  }).format(amount || 0);
  return <span className={className}>{formatted}</span>;
}

export function BonusSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-50 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-gray-900">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function formatBonusDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
