"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search, ShieldAlert, Users, Timer, AlertTriangle } from "lucide-react";
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
};

const RANGES = [
  { id: "24h", label: "Last 24 hours", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "all", label: "All time" },
] as const;

function actionColor(action: string) {
  if (["APPROVE", "RUN"].includes(action)) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (["REJECT", "CANCEL", "DELETE"].includes(action)) return "bg-red-50 text-red-600 border-red-100";
  if (action === "SETTING") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-violet-50 text-violet-700 border-violet-100";
}

function formatTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function exportCsv(rows: AuditLogRow[]) {
  const header = ["Timestamp", "Actor", "Role", "Action", "Module", "Entity"];
  const lines = rows.map((row) =>
    [
      formatTime(row.createdAt),
      row.actorName,
      row.actorRole ?? "",
      row.action,
      row.module,
      row.entityLabel ?? "",
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

export function AuditModule({
  initialRows,
  initialSummary,
  modules,
}: AuditModuleProps) {
  const [rows, setRows] = useState<AuditLogRow[]>(initialRows);
  const [summary, setSummary] = useState<AuditSummary>(initialSummary);
  const [module, setModule] = useState<string>("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<(typeof RANGES)[number]>((RANGES[1] as (typeof RANGES)[number]));

  const fetchAudit = useCallback(async () => {
    const params = new URLSearchParams();
    if (module) params.set("module", module);
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
  }, [module, search, range]);

  useEffect(() => {
    let cancelled = false;
    fetchAudit().then((data) => {
      if (!data || cancelled) return;
      setRows(data.rows ?? []);
      setSummary(data.summary ?? initialSummary);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchAudit, initialSummary]);

  const refresh = () => {
    void fetchAudit().then((data) => {
      if (!data) return;
      setRows(data.rows ?? []);
      setSummary(data.summary ?? initialSummary);
    });
  };

  const stats = useMemo(
    () => [
      { label: "Total events", value: summary.total, icon: ShieldAlert },
      { label: "Last 24 hours", value: summary.last24h, icon: Timer },
      { label: "Unique actors", value: summary.uniqueActors, icon: Users },
      {
        label: "Top action",
        value: summary.byAction[0] ? summary.byAction[0].action : "—",
        icon: AlertTriangle,
      },
    ],
    [summary]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 truncate">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold text-gray-900 truncate">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange((current) => (current.id === r.id ? current : r))}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors",
              range.id === r.id
                ? "bg-violet-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {r.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, module…"
            className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 w-56 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <button
          type="button"
          onClick={refresh}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => exportCsv(rows)}
          disabled={rows.length === 0}
          className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-gray-800 disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

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
                ? "bg-violet-600 text-white"
                : "bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100"
            )}
          >
            {m.replace(/-/g, " ")}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2.5 font-semibold">Time</th>
              <th className="px-4 py-2.5 font-semibold">Actor</th>
              <th className="px-4 py-2.5 font-semibold">Action</th>
              <th className="px-4 py-2.5 font-semibold">Module</th>
              <th className="px-4 py-2.5 font-semibold">Entity</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  No activity recorded for these filters yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                    {formatTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-gray-900 font-medium">{row.actorName}</p>
                    <p className="text-[11px] text-gray-400">{row.actorRole ?? ""}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                        actionColor(row.action)
                      )}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 capitalize text-gray-700">
                    {row.module.replace(/-/g, " ")}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-[220px] truncate" title={row.entityLabel ?? ""}>
                    {row.entityLabel ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-6">
        {summary.byModule.slice(0, 8).map((m) => (
          <div key={m.module} className="flex-1 min-w-[120px]">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-gray-500 capitalize">{m.module.replace(/-/g, " ")}</span>
              <span className="font-semibold text-gray-900">{m.count}</span>
            </div>
            <div className="mt-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full"
                style={{
                  width: `${summary.total ? Math.round((m.count / summary.total) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}