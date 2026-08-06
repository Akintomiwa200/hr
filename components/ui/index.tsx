import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldErrorToast } from "@/components/ui/field-error-toast";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50",
    secondary:
      "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-gray-600 hover:bg-gray-100",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "neutral";
}

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  const variants = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
    neutral: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full",
        variants[variant]
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-violet-600" />
        </div>
      </div>
    </div>
  );
}

export function Input({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
          error && "border-red-300 focus:ring-red-500",
          className
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? <FieldErrorToast error={error} /> : null}
    </div>
  );
}

export function Select({
  label,
  error,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        className={cn(
          "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
          error && "border-red-300",
          className
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
      {error ? <FieldErrorToast error={error} /> : null}
    </div>
  );
}

export function Textarea({
  label,
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none",
          error && "border-red-300",
          className
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? <FieldErrorToast error={error} /> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({
  firstName,
  lastName,
  src,
  size = "md",
}: {
  firstName: string;
  lastName: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={cn("rounded-full object-cover ring-2 ring-violet-100", sizes[size])}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-violet-100 text-violet-700 font-semibold flex items-center justify-center ring-2 ring-violet-50",
        sizes[size]
      )}
    >
      {initials}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    ACTIVE: { label: "Active", variant: "success" },
    INACTIVE: { label: "Inactive", variant: "neutral" },
    PENDING: { label: "Pending", variant: "warning" },
    APPROVED: { label: "Approved", variant: "success" },
    REJECTED: { label: "Rejected", variant: "error" },
    CANCELLED: { label: "Cancelled", variant: "neutral" },
    PRESENT: { label: "Present", variant: "success" },
    ABSENT: { label: "Absent", variant: "error" },
    LATE: { label: "Late", variant: "warning" },
    REMOTE: { label: "Remote", variant: "info" },
    HALF_DAY: { label: "Half Day", variant: "warning" },
    OPEN: { label: "Open", variant: "success" },
    CLOSED: { label: "Closed", variant: "neutral" },
    DRAFT: { label: "Draft", variant: "neutral" },
    PROCESSED: { label: "Processed", variant: "info" },
    PAID: { label: "Paid", variant: "success" },
    APPLIED: { label: "Applied", variant: "info" },
    SCREENING: { label: "Screening", variant: "warning" },
    INTERVIEW: { label: "Interview", variant: "info" },
    OFFER: { label: "Offer", variant: "success" },
    HIRED: { label: "Hired", variant: "success" },
    IN_PROGRESS: { label: "In Progress", variant: "warning" },
    COMPLETED: { label: "Completed", variant: "success" },
    NOT_STARTED: { label: "Not started", variant: "neutral" },
    SELF_REVIEW: { label: "Self review", variant: "info" },
    MANAGER_REVIEW: { label: "Manager review", variant: "warning" },
  };

  const config = map[status] || { label: status, variant: "neutral" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
