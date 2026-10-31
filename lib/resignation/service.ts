import type { ResignationSettingsData } from "@/lib/resignation-settings";

export const RESIGNATION_ACTIVE_STATUSES = [
  "PENDING_MANAGER",
  "PENDING_HR",
  "APPROVED",
] as const;

export const RESIGNATION_STATUSES = [
  "PENDING_MANAGER",
  "PENDING_HR",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
  "COMPLETED",
] as const;

export function isResignationStatus(
  value: string
): value is (typeof RESIGNATION_STATUSES)[number] {
  return (RESIGNATION_STATUSES as readonly string[]).includes(value);
}

export const RESIGNATION_STATUS_LABELS: Record<string, string> = {
  PENDING_MANAGER: "Manager endorsement",
  PENDING_HR: "HR approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  COMPLETED: "Completed",
};

export const RESIGNATION_STATUS_STYLES: Record<
  string,
  "warning" | "info" | "success" | "error" | "neutral"
> = {
  PENDING_MANAGER: "warning",
  PENDING_HR: "info",
  APPROVED: "success",
  REJECTED: "error",
  WITHDRAWN: "neutral",
  COMPLETED: "success",
};

export function isActiveResignationStatus(status: string): boolean {
  return (RESIGNATION_ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function resignationStatusLabel(status: string): string {
  return RESIGNATION_STATUS_LABELS[status] ?? status;
}

export function resignationStatusVariant(
  status: string
): "warning" | "info" | "success" | "error" | "neutral" {
  return RESIGNATION_STATUS_STYLES[status] ?? "neutral";
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Default last working day from the company notice period. */
export function defaultLastWorkingDay(
  noticePeriodDays: number,
  from = new Date()
): Date {
  const base = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 12, 0, 0)
  );
  return addDays(base, noticePeriodDays);
}

/**
 * First stage after an employee submits.
 * Managers endorse when configured and present; otherwise HR takes over.
 */
export function statusAfterSubmission(
  settings: Pick<
    ResignationSettingsData,
    "managerEndorsementRequired" | "hrApprovalRequired"
  >,
  hasManager: boolean
): "PENDING_MANAGER" | "PENDING_HR" | "APPROVED" {
  if (settings.managerEndorsementRequired && hasManager) return "PENDING_MANAGER";
  if (settings.hrApprovalRequired) return "PENDING_HR";
  return "APPROVED";
}

/** Next stage once a manager endorses. */
export function statusAfterEndorsement(
  settings: Pick<ResignationSettingsData, "hrApprovalRequired">
): "PENDING_HR" | "APPROVED" {
  return settings.hrApprovalRequired ? "PENDING_HR" : "APPROVED";
}

export function canWithdrawStatus(
  status: string,
  settings: Pick<ResignationSettingsData, "allowWithdrawal">
): boolean {
  if (!settings.allowWithdrawal) return false;
  return status === "PENDING_MANAGER" || status === "PENDING_HR";
}

export function noticeDaysBetween(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}
