import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "violet" | "blue" | "amber" | "emerald" | "sky" | "red" | "indigo";

const toneStyles: Record<StatTone, { tile: string; text: string; soft: string }> = {
  violet: {
    tile: "bg-gradient-to-br from-[#7B61FF] to-[#a78bfa] text-white",
    text: "text-[#7B61FF]",
    soft: "bg-violet-50 text-violet-700",
  },
  blue: {
    tile: "bg-gradient-to-br from-blue-500 to-sky-400 text-white",
    text: "text-blue-600",
    soft: "bg-blue-50 text-blue-700",
  },
  amber: {
    tile: "bg-gradient-to-br from-amber-500 to-orange-400 text-white",
    text: "text-amber-600",
    soft: "bg-amber-50 text-amber-700",
  },
  emerald: {
    tile: "bg-gradient-to-br from-emerald-500 to-teal-400 text-white",
    text: "text-emerald-600",
    soft: "bg-emerald-50 text-emerald-700",
  },
  sky: {
    tile: "bg-gradient-to-br from-sky-500 to-cyan-400 text-white",
    text: "text-sky-600",
    soft: "bg-sky-50 text-sky-700",
  },
  red: {
    tile: "bg-gradient-to-br from-rose-500 to-red-400 text-white",
    text: "text-rose-600",
    soft: "bg-rose-50 text-rose-700",
  },
  indigo: {
    tile: "bg-gradient-to-br from-indigo-500 to-violet-400 text-white",
    text: "text-indigo-600",
    soft: "bg-indigo-50 text-indigo-700",
  },
};

export function getTone(tone: StatTone) {
  return toneStyles[tone];
}

/** Gradient hero banner shown at the top of every dashboard. */
export function DashboardHero({
  title,
  subtitle,
  controls,
  badge,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  controls?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6d5bd0] via-[#7B61FF] to-[#a78bfa] text-white shadow-[0_16px_40px_-16px_rgba(123,97,255,0.55)]">
      <div className="absolute -top-14 -right-14 w-64 h-64 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative px-5 sm:px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="min-w-0">
          {badge && (
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium ring-1 ring-white/20 backdrop-blur">
              {badge}
            </div>
          )}
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-white [text-shadow:0_1px_0_rgba(0,0,0,0.12)]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/80 max-w-2xl">{subtitle}</p>
          )}
        </div>
        {controls && <div className="flex items-center gap-3 shrink-0">{controls}</div>}
      </div>
    </section>
  );
}

/** Glassy control container used inside the hero. */
export function HeroControls({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-2xl bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur">
      {children}
    </div>
  );
}

/** Trend pill shown next to stat values. */
export function TrendPill({
  children,
  positive = true,
  neutral = false,
}: {
  children: ReactNode;
  positive?: boolean;
  neutral?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        neutral
          ? "bg-gray-100 text-gray-600"
          : positive
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-600"
      )}
    >
      {children}
    </span>
  );
}

const cardClass =
  "rounded-2xl border border-gray-100/90 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-16px_rgba(16,24,40,0.14)] transition-shadow hover:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_16px_36px_-16px_rgba(16,24,40,0.18)]";

/** Modern stat card with gradient icon tile. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "violet",
  trend,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  trend?: { label: ReactNode; positive: boolean; neutral?: boolean } | null;
  hint?: ReactNode;
  className?: string;
}) {
  const styles = getTone(tone);
  return (
    <div className={cn(cardClass, "p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium text-gray-500 leading-tight">{label}</p>
        <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", styles.tile)}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-[28px] font-bold tracking-tight text-gray-900 leading-none">{value}</p>
        {trend && <TrendPill positive={trend.positive} neutral={trend.neutral}>{trend.label}</TrendPill>}
      </div>
      {hint && <p className="mt-2 text-[11.5px] text-gray-400">{hint}</p>}
    </div>
  );
}

/** Unified panel/card container with optional icon title and action. */
export function PanelCard({
  title,
  icon: Icon,
  tone = "violet",
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: StatTone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const styles = getTone(tone);
  return (
    <div className={cn(cardClass, "overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-50 px-5 py-4">
        <h3 className="flex items-center gap-2.5 text-[13px] font-semibold text-gray-900">
          {Icon && (
            <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", styles.soft)}>
              <Icon className={cn("w-4 h-4", styles.text)} />
            </span>
          )}
          {title}
        </h3>
        {action}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}

/** Compact empty-state placeholder. */
export function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-gray-400">{message}</p>;
}

/** Section label between dashboard blocks. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
      {children}
    </p>
  );
}