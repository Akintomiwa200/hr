import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats money using the platform currency (default: Nigerian Naira). */
export function formatCurrency(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY
) {
  return formatMoney(amount, currencyCode);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}

export function formatRelativeTime(date: Date | string) {
  const value = new Date(date).getTime();
  const diffMs = Date.now() - value;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(date);
}
