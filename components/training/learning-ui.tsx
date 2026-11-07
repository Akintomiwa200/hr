import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const learningInput =
  "block min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export const learningSelect = learningInput;

const STATUS_TONES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
  ASSIGNED: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  EXPIRED: "bg-rose-50 text-rose-700",
  EXPIRING: "bg-amber-50 text-amber-700",
  VALID: "bg-emerald-50 text-emerald-700",
  SKILL: "bg-sky-50 text-sky-700",
  CERTIFICATION: "bg-amber-50 text-amber-700",
  OVERDUE: "bg-rose-50 text-rose-700",
  NOT_STARTED: "bg-gray-100 text-gray-600",
};

export function LearningStatus({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        STATUS_TONES[value] ?? "bg-gray-100 text-gray-600",
        className
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function LearningStat({
  icon: Icon,
  label,
  value,
  hint,
  compact = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <Icon className="h-4 w-4 text-violet-600" />
        {label}
      </div>
      <p
        className={cn(
          "mt-3 font-bold text-gray-900",
          compact ? "text-base" : "text-2xl tabular-nums"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </article>
  );
}

export function LearningPanel({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LearningField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold text-gray-700">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-500">{hint}</span>}
    </label>
  );
}

export function LearningProgress({
  value,
  tone = "violet",
  className,
}: {
  value: number;
  tone?: "violet" | "emerald" | "amber";
  className?: string;
}) {
  const bar =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-violet-600";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-gray-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all", bar)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function LearningEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-gray-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LearningError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
        <div>
          <h2 className="font-semibold text-rose-900">Learning data is unavailable</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-rose-800">{message}</p>
          <button
            onClick={retry}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      </div>
    </section>
  );
}

export function LearningToolbar({
  search,
  setSearch,
  placeholder,
  label,
  children,
}: {
  search: string;
  setSearch: (value: string) => void;
  placeholder: string;
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-gray-800">{label}</h2>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <label className="relative w-full sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className={`${learningInput} pl-9`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={placeholder}
          />
        </label>
        {children}
      </div>
    </div>
  );
}

export function LearningSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-52 animate-pulse rounded-2xl border border-gray-100 bg-white p-5"
        >
          <div className="h-10 w-10 rounded-xl bg-gray-100" />
          <div className="mt-5 h-4 w-2/3 rounded bg-gray-100" />
          <div className="mt-3 h-3 w-full rounded bg-gray-100" />
          <div className="mt-2 h-3 w-4/5 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function formatLearningDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatLearningDuration(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return "Self-paced";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function courseLevelLabel(level: string | null | undefined) {
  if (!level) return "All levels";
  return level.charAt(0) + level.slice(1).toLowerCase();
}

export function courseFormatLabel(format: string | null | undefined) {
  const map: Record<string, string> = {
    SELF_PACED: "Self-paced",
    INSTRUCTOR_LED: "Instructor-led",
    BLENDED: "Blended",
    EXTERNAL: "External",
  };
  return map[format ?? ""] ?? "Self-paced";
}

export function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "COMPLETED") return false;
  return new Date(dueDate).getTime() < Date.now();
}
