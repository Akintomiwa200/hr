import { Badge } from "@/components/ui";

const HR_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "ON BOARDING": "bg-amber-50 text-amber-700 border-amber-200",
  PROBATION: "bg-violet-50 text-violet-700 border-violet-200",
  "ON LEAVE": "bg-rose-50 text-rose-700 border-rose-200",
  RESIGNED: "bg-gray-100 text-gray-600 border-gray-200",
  INACTIVE: "bg-gray-100 text-gray-600 border-gray-200",
};

export function HrStatusBadge({ status }: { status: string }) {
  const style = HR_STATUS_STYLES[status] ?? HR_STATUS_STYLES.ACTIVE;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${style}`}
    >
      {status}
    </span>
  );
}

/** @deprecated use HrStatusBadge for HR reports */
export function statusBadge(status: string) {
  const variant =
    status === "ACTIVE" || status === "COMPLETED"
      ? "success"
      : status === "INACTIVE" || status === "REJECTED"
        ? "error"
        : status === "IN_PROGRESS" || status === "PENDING"
          ? "warning"
          : "neutral";
  return <Badge variant={variant}>{status}</Badge>;
}
