export type DashboardRangeKey =
  | "this-month"
  | "last-30-days"
  | "last-month"
  | "this-quarter"
  | "year-to-date";

export type DashboardDateRange = {
  key: DashboardRangeKey;
  label: string;
  start: Date;
  end: Date;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function quarterStart(date: Date) {
  const month = date.getMonth();
  const q = Math.floor(month / 3) * 3;
  return new Date(date.getFullYear(), q, 1);
}

export const dashboardRangeOptions: { key: DashboardRangeKey; label: string }[] = [
  { key: "this-month", label: "This month" },
  { key: "last-30-days", label: "Last 30 days" },
  { key: "last-month", label: "Last month" },
  { key: "this-quarter", label: "This quarter" },
  { key: "year-to-date", label: "Year to date" },
];

export function parseDashboardRangeKey(value?: string | null): DashboardRangeKey {
  const valid = dashboardRangeOptions.map((o) => o.key);
  if (value && valid.includes(value as DashboardRangeKey)) {
    return value as DashboardRangeKey;
  }
  return "this-month";
}

export function resolveDashboardRange(key: DashboardRangeKey, now = new Date()): DashboardDateRange {
  const today = startOfDay(now);
  const option = dashboardRangeOptions.find((o) => o.key === key)!;

  switch (key) {
    case "last-30-days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { key, label: option.label, start, end: endOfDay(today) };
    }
    case "last-month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
      return { key, label: option.label, start, end };
    }
    case "this-quarter": {
      return {
        key,
        label: option.label,
        start: startOfDay(quarterStart(today)),
        end: endOfDay(today),
      };
    }
    case "year-to-date": {
      return {
        key,
        label: option.label,
        start: new Date(today.getFullYear(), 0, 1),
        end: endOfDay(today),
      };
    }
    case "this-month":
    default: {
      return {
        key: "this-month",
        label: "This month",
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: endOfDay(today),
      };
    }
  }
}

export function getPreviousPeriod(range: DashboardDateRange): { start: Date; end: Date } {
  const durationMs = range.end.getTime() - range.start.getTime() + 1;
  const prevEnd = new Date(range.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  prevStart.setHours(0, 0, 0, 0);
  return { start: prevStart, end: prevEnd };
}

export function formatDashboardRangeLabel(start: Date, end: Date) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}
