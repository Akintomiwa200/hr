import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth";

/**
 * Server-side guard shared by every platform-control screen. Keeping this in
 * one place means each page only has to describe its own data, never repeat
 * the access rules.
 */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");
  return session;
}

export function formatPlatformDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPlatformDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Shared tone map for platform status pills. */
export function platformStatusClass(status: string) {
  const normalized = status.toUpperCase();
  if (
    [
      "ACTIVE",
      "CONNECTED",
      "SENT",
      "READY",
      "PUBLISHED",
      "PAID",
      "RESOLVED",
      "COMPLETED",
      "CONFIGURED",
    ].includes(normalized)
  ) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (
    [
      "PAST_DUE",
      "ERROR",
      "FAILED",
      "LOCKED",
      "CANCELLED",
      "SUSPENDED",
      "OVER LIMIT",
      "NOT CONFIGURED",
    ].includes(normalized)
  ) {
    return "bg-rose-50 text-rose-700";
  }
  if (
    ["TRIAL", "PENDING", "QUEUED", "AT LIMIT", "WARNING", "IN PROGRESS", "DRAFT"].includes(
      normalized
    )
  ) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-gray-100 text-gray-600";
}

export function platformStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function platformAdminName(preferences: string | null, email: string) {
  if (preferences) {
    try {
      const parsed = JSON.parse(preferences) as Record<string, unknown>;
      const name = [parsed.firstName, parsed.lastName]
        .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
        .join(" ")
        .trim();
      if (name) return name;
    } catch {
      // Ignore malformed preference JSON and fall back to the email local part.
    }
  }
  return email.split("@")[0];
}
