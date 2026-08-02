import { differenceInCalendarDays } from "date-fns";

export function leaveDays(start: Date | string, end: Date | string) {
  return differenceInCalendarDays(new Date(end), new Date(start)) + 1;
}

export function leaveTypeLabel(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ");
}

export function leaveTypeStyle(type: string) {
  const map: Record<string, { badge: string; dot: string }> = {
    ANNUAL: { badge: "bg-brand-50 text-brand-700", dot: "bg-brand-500" },
    SICK: { badge: "bg-red-50 text-red-700", dot: "bg-red-500" },
    PERSONAL: { badge: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
    MATERNITY: { badge: "bg-pink-50 text-pink-700", dot: "bg-pink-500" },
    PATERNITY: { badge: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
    UNPAID: { badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  };
  return map[type] ?? { badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
}
