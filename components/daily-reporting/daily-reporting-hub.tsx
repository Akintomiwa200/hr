"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  Clock3,
  Copy,
  Ellipsis,
  FileText,
  Filter,
  LayoutTemplate,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button, EmptyState, PageHeader, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { notify, readApiError } from "@/lib/toast";
import {
  DAILY_REPORT_TEMPLATES,
  dailyReportTemplateLabel,
} from "@/lib/daily-reporting/templates";

export type DailyReportListItem = {
  id: string;
  title: string;
  status: string;
  template: string;
  reportDate: string;
  updatedAt: string;
  createdAt: string;
  excerpt: string;
  searchText: string;
  wordCount: number;
};

const TEMPLATE_ACCENTS: Record<string, string> = {
  standup: "bg-violet-50 text-violet-600",
  "end-of-day": "bg-blue-50 text-blue-600",
  "team-pulse": "bg-emerald-50 text-emerald-600",
  blockers: "bg-rose-50 text-rose-600",
  handover: "bg-amber-50 text-amber-600",
};

const SORT_OPTIONS = [
  { id: "updated_desc", label: "Last updated" },
  { id: "date_desc", label: "Report date (newest)" },
  { id: "date_asc", label: "Report date (oldest)" },
  { id: "title_asc", label: "Title (A–Z)" },
];

export function DailyReportingHub({
  reports,
  firstName,
}: {
  reports: DailyReportListItem[];
  firstName: string;
}) {
  const router = useRouter();
  useAppEvents({
    types: ["daily_report_updated"],
    onEvent: () => scheduleRouterRefresh(() => router.refresh()),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [templateFilter, setTemplateFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState("updated_desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyReportListItem | null>(null);
  const [loading, setLoading] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) setFilterOpen(false);
      if (newMenuRef.current && !newMenuRef.current.contains(target)) setNewMenuOpen(false);
      const element = target instanceof Element ? target : null;
      if (!element?.closest("[data-report-menu]")) setRowMenu(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const activeFilterCount =
    (statusFilter !== "ALL" ? 1 : 0) +
    (templateFilter !== "ALL" ? 1 : 0) +
    (fromDate ? 1 : 0) +
    (toDate ? 1 : 0);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const start = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const end = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;

    const list = reports.filter((report) => {
      if (statusFilter !== "ALL" && report.status !== statusFilter) return false;
      if (templateFilter !== "ALL" && report.template !== templateFilter) return false;

      const reportedAt = new Date(report.reportDate).getTime();
      if (start !== null && reportedAt < start) return false;
      if (end !== null && reportedAt > end) return false;

      if (!needle) return true;
      return `${report.title} ${report.excerpt} ${report.searchText}`.toLowerCase().includes(needle);
    });

    return [...list].sort((a, b) => {
      switch (sort) {
        case "date_desc":
          return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
        case "date_asc":
          return new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime();
        case "title_asc":
          return a.title.localeCompare(b.title);
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [reports, search, statusFilter, templateFilter, fromDate, toDate, sort]);

  const clearFilters = () => {
    setStatusFilter("ALL");
    setTemplateFilter("ALL");
    setFromDate("");
    setToDate("");
  };

  const duplicate = async (report: DailyReportListItem) => {
    setRowMenu(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-reports/${report.id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not duplicate this report"));
        return;
      }
      const copy = (await res.json()) as { id: string };
      notify.success("Report duplicated");
      router.push(`/daily-reporting/${copy.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-reports/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not delete this report"));
        return;
      }
      notify.success("Report deleted");
      setDeleteTarget(null);
      setRowMenu(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Daily reporting"
        description={`Good to see you, ${firstName}. Write your daily report from a blank page or a template, then find it again in your history.`}
        action={
          <div className="relative" ref={newMenuRef}>
            <div className="inline-flex overflow-hidden rounded-lg shadow-sm">
              <Link
                href="/daily-reporting/new"
                className="inline-flex items-center gap-2 bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" /> New report
              </Link>
              <button
                type="button"
                onClick={() => setNewMenuOpen((open) => !open)}
                aria-label="Choose a report template"
                className="border-l border-white/20 bg-violet-600 px-2 text-white transition-colors hover:bg-violet-700"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${newMenuOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            {newMenuOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <Link
                  href="/daily-reporting/new"
                  onClick={() => setNewMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 text-gray-400" /> Blank report
                </Link>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  From a template
                </p>
                {DAILY_REPORT_TEMPLATES.map((template) => (
                  <Link
                    key={template.id}
                    href={`/daily-reporting/new?template=${template.id}`}
                    onClick={() => setNewMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="h-4 w-4 text-violet-400" /> {template.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Link
          href="/daily-reporting/new"
          className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Plus className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              Blank report
              <ArrowRight className="h-4 w-4 -translate-x-1 text-violet-500 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-gray-500">
              Start with a clean page and write freely. Formatting, headings, lists and links are all
              available.
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => {
            document.getElementById("report-templates")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-violet-50/80 to-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 ring-1 ring-violet-100">
            <LayoutTemplate className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              Browse templates
              <ArrowRight className="h-4 w-4 -translate-x-1 text-violet-500 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-gray-500">
              Standups, end-of-day summaries, team pulse, escalation notes and shift handovers.
            </span>
          </span>
        </button>
      </div>

      <section id="report-templates" className="mb-8 scroll-mt-24">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Start from a template</h2>
            <p className="text-xs text-gray-500">Every template is a starting point — edit it however you like.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DAILY_REPORT_TEMPLATES.map((template) => (
            <Link
              key={template.id}
              href={`/daily-reporting/new?template=${template.id}`}
              className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-sm"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  TEMPLATE_ACCENTS[template.id] ?? "bg-gray-50 text-gray-500"
                }`}
              >
                <NotebookPen className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900 group-hover:text-violet-700">
                  {template.name}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
                  {template.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search previous reports..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((open) => !open)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                activeFilterCount > 0
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-medium text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-80 space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-red-500 hover:text-red-600"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Template</label>
                  <select
                    value={templateFilter}
                    onChange={(event) => setTemplateFilter(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  >
                    <option value="ALL">All templates</option>
                    <option value="blank">Blank report</option>
                    {DAILY_REPORT_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Report date</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="mb-1 block text-[11px] text-gray-400">From</span>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-[11px] text-gray-400">To</span>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-400">
                    {filtered.length} report{filtered.length === 1 ? "" : "s"} found
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort reports"
              className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Previous reports</h2>
            <p className="text-xs text-gray-500">
              {reports.length} saved report{reports.length === 1 ? "" : "s"} — open any report to keep editing.
            </p>
          </div>
          {(search || activeFilterCount > 0) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                clearFilters();
              }}
              className="text-xs font-medium text-violet-600 hover:text-violet-700"
            >
              Reset view
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <EmptyState
              icon={NotebookPen}
              title={reports.length === 0 ? "No daily reports yet" : "No reports match your filters"}
              description={
                reports.length === 0
                  ? "Start with a blank page or pick a template. Your reports will appear here for easy access."
                  : "Try a different search term, status, template, or date range."
              }
              action={
                reports.length === 0 ? (
                  <Link href="/daily-reporting/new">
                    <Button>
                      <Plus className="h-4 w-4" /> Write your first report
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      clearFilters();
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((report) => (
              <div
                key={report.id}
                className="group relative flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
              >
                <Link href={`/daily-reporting/${report.id}`} className="flex min-w-0 flex-1 items-start gap-3.5">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                        {report.title}
                      </span>
                      {statusBadge(report.status)}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-gray-500">
                      {report.excerpt || "No content yet — open the report to start writing."}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> {formatDate(report.reportDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" /> Updated {formatRelativeTime(report.updatedAt)}
                      </span>
                      <span>{dailyReportTemplateLabel(report.template)}</span>
                      <span>{report.wordCount} word{report.wordCount === 1 ? "" : "s"}</span>
                    </span>
                  </span>
                </Link>

                <div className="relative shrink-0" data-report-menu>
                  <button
                    type="button"
                    onClick={() => setRowMenu((open) => (open === report.id ? null : report.id))}
                    aria-label={`Actions for ${report.title}`}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Ellipsis className="h-5 w-5" />
                  </button>
                  {rowMenu === report.id && (
                    <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <Link
                        href={`/daily-reporting/${report.id}`}
                        onClick={() => setRowMenu(null)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <FileText className="h-4 w-4 text-gray-400" /> Open report
                      </Link>
                      <button
                        type="button"
                        onClick={() => duplicate(report)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="h-4 w-4 text-gray-400" /> Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRowMenu(null);
                          setDeleteTarget(report);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete daily report"
        description="This permanently removes the report and its contents."
      >
        <p className="mb-4 text-sm text-gray-600">
          Delete <strong>{deleteTarget?.title || "this report"}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={remove}>
            <Trash2 className="h-4 w-4" /> Delete report
          </Button>
        </div>
      </Dialog>
    </>
  );
}
