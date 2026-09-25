"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Download,
  FileUp,
  PencilLine,
  Play,
  PlusCircle,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Timer,
  Trash2,
  UserMinus,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditSummary } from "@/lib/audit";

type AuditLogRow = {
  id: string;
  companyId: string | null;
  actorUserId: string | null;
  actorName: string;
  actorRole: string | null;
  action: string;
  module: string;
  entityId: string | null;
  entityLabel: string | null;
  meta: unknown;
  ipAddress: string | null;
  createdAt: Date | string;
};

type AuditModuleProps = {
  initialRows: AuditLogRow[];
  initialSummary: AuditSummary;
  modules: readonly string[];
  actions?: readonly string[];
};

const RANGES = [
  { id: "24h", label: "Last 24 hours", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "all", label: "All time" },
] as const;

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  APPROVE: "Approve",
  REJECT: "Reject",
  CANCEL: "Cancel",
  SETTING: "Setting",
  RUN: "Run",
  IMPORT: "Import",
  SYNC: "Sync",
  OFFBOARD: "Offboard",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.toLowerCase();
}

function actionVisual(action: string) {
  switch (action) {
    case "CREATE":
      return { icon: PlusCircle, badge: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    case "UPDATE":
      return { icon: PencilLine, badge: "bg-sky-50 text-sky-700 border-sky-100" };
    case "DELETE":
      return { icon: Trash2, badge: "bg-red-50 text-red-600 border-red-100" };
    case "APPROVE":
      return { icon: CheckCircle2, badge: "bg-teal-50 text-teal-700 border-teal-100" };
    case "REJECT":
      return { icon: XCircle, badge: "bg-rose-50 text-rose-600 border-rose-100" };
    case "CANCEL":
      return { icon: Ban, badge: "bg-orange-50 text-orange-600 border-orange-100" };
    case "SETTING":
      return { icon: Settings, badge: "bg-amber-50 text-amber-700 border-amber-100" };
    case "RUN":
      return { icon: Play, badge: "bg-violet-50 text-violet-700 border-violet-100" };
    case "IMPORT":
      return { icon: FileUp, badge: "bg-blue-50 text-blue-700 border-blue-100" };
    case "SYNC":
      return { icon: RefreshCw, badge: "bg-cyan-50 text-cyan-700 border-cyan-100" };
    case "OFFBOARD":
      return { icon: UserMinus, badge: "bg-indigo-50 text-indigo-700 border-indigo-100" };
    default:
      return { icon: ShieldAlert, badge: "bg-gray-100 text-gray-600 border-gray-100" };
  }
}

const DONUT_COLORS = [
  "#6b51ef",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#64748b",
];

function toDate(value: Date | string) {
  return typeof value === "string" ? new Date(value) : value;
}

function absoluteTime(value: Date | string) {
  return toDate(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(value: Date | string) {
  const diff = Math.max(0, Date.now() - toDate(value).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return toDate(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dayLabel(value: Date | string) {
  const date = new Date(toDate(value));
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function exportCsv(rows: AuditLogRow[]) {
  const header = ["Timestamp", "Actor", "Role", "Action", "Module", "Entity", "IP Address"];
  const lines = rows.map((row) =>
    [
      absoluteTime(row.createdAt),
      row.actorName,
      row.actorRole ?? "",
      actionLabel(row.action),
      row.module,
      row.entityLabel ?? "",
      row.ipAddress ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ActionDonut({
  items,
  total,
}: {
  items: { action: string; count: number }[];
  total: number;
}) {
  const R = 60;
  const C = 2 * Math.PI * R;
  const pad = (2 / 360) * C;
  let acc = -90;
  const segments = items.slice(0, 8).map((item, i) => {
    const f = total > 0 ? item.count / total : 0;
    const dash = f * C - pad;
    const rot = acc;
    acc += f * 360;
    return {
      item,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      dash,
      rot,
      pct: f * 100,
    };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full">
          <circle cx="80" cy="80" r={R} fill="none" stroke="#f3f4f6" strokeWidth="18" />
          {total > 0 &&
            segments.map(({ item, color, dash, rot }) => (
              <circle
                key={item.action}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${C - dash}`}
                transform={`rotate(${rot} 80 80)`}
              >
                <title>{`${actionLabel(item.action)}: ${item.count}`}</title>
              </circle>
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            events
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {total === 0 ? (
          <p className="text-sm text-gray-400">No activity in this period.</p>
        ) : (
          segments.map(({ item, color, pct }) => (
            <div key={item.action} className="flex items-center gap-2 text-[13px]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="flex-1 truncate text-gray-700 capitalize">
                {actionLabel(item.action)}
              </span>
              <span className="font-medium text-gray-500">{item.count}</span>
              <span className="w-10 text-right text-[11px] text-gray-400">
                {pct.toFixed(0)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AuditModule({
  initialRows,
  initialSummary,
  modules,
  actions = [],
}: AuditModuleProps) {
  const [rows, setRows] = useState<AuditLogRow[]>(initialRows);
  const [summary, setSummary] = useState<AuditSummary>(initialSummary);
  const [module, setModule] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[1]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAudit = useCallback(async () => {
    const params = new URLSearchParams();
    if (module) params.set("module", module);
    if (action) params.set("action", action);
    if (search.trim()) params.set("search", search.trim());
    if (range.id !== "all" && range.days) {
      params.set("from", new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString());
    }
    const res = await fetch(`/api/reports/audit?${params.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as {
      rows: AuditLogRow[];
      summary: AuditSummary;
    };
  }, [module, action, search, range]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      fetchAudit().then((data) => {
        if (cancelled) return;
        setLoading(false);
        if (!data) return;
        setRows(data.rows ?? []);
        setSummary(data.summary ?? initialSummary);
        setExpandedId(null);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchAudit, initialSummary]);

  const refresh = () => {
    setLoading(true);
    fetchAudit().then((data) => {
      setLoading(false);
      if (!data) return;
      setRows(data.rows ?? []);
      setSummary(data.summary ?? initialSummary);
      setExpandedId(null);
    });
  };

  const stats = useMemo(() => {
    const top = summary.byAction[0];
    const topVisual = top ? actionVisual(top.action) : { icon: ShieldAlert };
    const TopIcon = topVisual.icon;
    return [
      { label: "Total events", value: summary.total.toLocaleString(), icon: ShieldAlert, tint: "bg-brand-50 text-brand-600" },
      {
        label: "Last 24 hours",
        value: summary.last24h.toLocaleString(),
        icon: Timer,
        tint: "bg-sky-50 text-sky-600",
      },
      { label: "Unique actors", value: summary.uniqueActors.toLocaleString(), icon: Users, tint: "bg-emerald-50 text-emerald-600" },
      { label: "Top action", value: top ? actionLabel(top.action) : "—", icon: TopIcon, tint: "bg-violet-50 text-violet-600" },
    ];
  }, [summary]);

  const moduleMax = summary.byModule[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-3 shadow-sm"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  stat.tint
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 truncate">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold text-gray-900 truncate capitalize">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics: actions donut + module activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Activity by action</h3>
            <span className="text-[11px] text-gray-400">Top {Math.min(summary.byAction.length, 8)} actions</span>
          </div>
          <ActionDonut items={summary.byAction} total={summary.total} />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Activity by module</h3>
            <span className="text-[11px] text-gray-400">{summary.byModule.length} modules active</span>
          </div>
          <div className="space-y-3">
            {summary.byModule.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                No module activity in this period.
              </p>
            ) : (
              summary.byModule.slice(0, 10).map((m) => (
                <div key={m.module}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <span className="text-gray-600 capitalize">
                      {m.module.replace(/-/g, " ")}
                    </span>
                    <span className="font-semibold text-gray-900">{m.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-violet-400 rounded-full"
                      style={{ width: `${Math.round((m.count / moduleMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-gray-100 bg-white p-1 shadow-sm">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange((current) => (current.id === r.id ? current : r))}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors",
                range.id === r.id
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, module, entity…"
            className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-700 w-60 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 capitalize"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a} className="capitalize">
              {actionLabel(a)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => exportCsv(rows)}
          disabled={rows.length === 0}
          className="px-3 py-2 rounded-lg bg-gray-900 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-gray-800 disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Module chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setModule("")}
          className={cn(
            "px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors",
            module === ""
              ? "bg-gray-900 text-white"
              : "bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100"
          )}
        >
          All modules
        </button>
        {modules.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModule((current) => (current === m ? "" : m))}
            className={cn(
              "px-2.5 py-1 rounded-full text-[12px] font-medium capitalize transition-colors",
              module === m
                ? "bg-brand-600 text-white"
                : "bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100"
            )}
          >
            {m.replace(/-/g, " ")}
          </button>
        ))}
      </div>

      {/* Activity trail table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <h3 className="text-sm font-semibold text-gray-900">Latest activity</h3>
          </div>
          <span className="text-[12px] text-gray-400">{rows.length} shown</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-2.5 font-semibold">Time</th>
                <th className="px-5 py-2.5 font-semibold">Actor</th>
                <th className="px-5 py-2.5 font-semibold">Action</th>
                <th className="px-5 py-2.5 font-semibold">Module</th>
                <th className="px-5 py-2.5 font-semibold">Entity</th>
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mb-3">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">
                        No activity recorded for these filters yet.
                      </p>
                      <p className="text-[12.5px] text-gray-400 mt-1 max-w-xs">
                        Try widening the time range or clearing the search and module filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const visual = actionVisual(row.action);
                  const ActionIcon = visual.icon;
                  const open = expandedId === row.id;
                  return (
                    <FragmentRow
                      key={row.id}
                      row={row}
                      open={open}
                      onToggle={() => setExpandedId(open ? null : row.id)}
                      Visual={
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap",
                            visual.badge
                          )}
                        >
                          <ActionIcon className="w-3.5 h-3.5" />
                          {actionLabel(row.action)}
                        </span>
                      }
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  row,
  open,
  onToggle,
  Visual,
}: {
  row: AuditLogRow;
  open: boolean;
  onToggle: () => void;
  Visual: React.ReactNode;
}) {
  const date = toDate(row.createdAt);
  const metaStr =
    row.meta && typeof row.meta === "object" ? JSON.stringify(row.meta, null, 2) : "";
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "border-b border-gray-50 last:border-0 cursor-pointer transition-colors hover:bg-brand-50/20",
          open && "bg-brand-50/30"
        )}
      >
        <td className="px-5 py-3 whitespace-nowrap">
          <p className="text-[12px] font-medium text-gray-900">{relativeTime(date)}</p>
          <p className="text-[11px] text-gray-400">{dayLabel(date)} · {absoluteTime(date)}</p>
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-400 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {initialsOf(row.actorName)}
            </div>
            <div className="min-w-0">
              <p className="text-gray-900 font-medium truncate max-w-[140px]">{row.actorName}</p>
              {row.actorRole && (
                <p className="text-[11px] text-gray-400 capitalize">{row.actorRole.toLowerCase()}</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-5 py-3">{Visual}</td>
        <td className="px-5 py-3">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 capitalize">
            {row.module.replace(/-/g, " ")}
          </span>
        </td>
        <td className="px-5 py-3 text-gray-600 max-w-[220px] truncate" title={row.entityLabel ?? ""}>
          {row.entityLabel ?? "—"}
        </td>
        <td className="px-3 py-3">
          <ChevronDown
            className={cn("w-4 h-4 text-gray-400 transition-transform", open && "rotate-180")}
          />
        </td>
      </tr>
      {open && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td colSpan={6} className="px-5 py-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-[12.5px]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">
                  IP address
                </p>
                <p className="text-gray-700 font-mono">{row.ipAddress ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">
                  Entity ID
                </p>
                <p className="text-gray-700 font-mono truncate max-w-[220px]">{row.entityId ?? "—"}</p>
              </div>
              {metaStr && (
                <div className="w-full pt-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">
                    Details
                  </p>
                  <pre className="rounded-lg bg-gray-900 text-gray-100 text-[11px] leading-relaxed p-3 overflow-x-auto font-mono">
                    {metaStr}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}