"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  Clock3,
  Copy,
  Ellipsis,
  FilePlus2,
  FileText,
  Filter,
  Grid2X2,
  LayoutList,
  LayoutTemplate,
  NotebookPen,
  Plus,
  Search,
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
  type DailyReportTemplate,
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

const TEMPLATE_STYLES: Record<
  string,
  { paper: string; bar: string; ring: string; icon: string }
> = {
  blank: {
    paper: "from-slate-100 via-white to-white",
    bar: "bg-slate-300",
    ring: "group-hover:border-slate-300",
    icon: "bg-slate-100 text-slate-600",
  },
  standup: {
    paper: "from-violet-100 via-violet-50 to-white",
    bar: "bg-violet-400",
    ring: "group-hover:border-violet-300",
    icon: "bg-violet-100 text-violet-600",
  },
  "end-of-day": {
    paper: "from-blue-100 via-blue-50 to-white",
    bar: "bg-blue-400",
    ring: "group-hover:border-blue-300",
    icon: "bg-blue-100 text-blue-600",
  },
  "team-pulse": {
    paper: "from-emerald-100 via-emerald-50 to-white",
    bar: "bg-emerald-400",
    ring: "group-hover:border-emerald-300",
    icon: "bg-emerald-100 text-emerald-600",
  },
  blockers: {
    paper: "from-rose-100 via-rose-50 to-white",
    bar: "bg-rose-400",
    ring: "group-hover:border-rose-300",
    icon: "bg-rose-100 text-rose-600",
  },
  handover: {
    paper: "from-amber-100 via-amber-50 to-white",
    bar: "bg-amber-400",
    ring: "group-hover:border-amber-300",
    icon: "bg-amber-100 text-amber-600",
  },
};

const FILE_STYLES: Record<string, { accent: string; tile: string; paper: string }> = {
  blank: {
    accent: "bg-slate-300",
    tile: "bg-slate-100 text-slate-500",
    paper: "from-slate-100 via-white to-white",
  },
  standup: {
    accent: "bg-violet-400",
    tile: "bg-violet-50 text-violet-600",
    paper: "from-violet-100 via-violet-50 to-white",
  },
  "end-of-day": {
    accent: "bg-blue-400",
    tile: "bg-blue-50 text-blue-600",
    paper: "from-blue-100 via-blue-50 to-white",
  },
  "team-pulse": {
    accent: "bg-emerald-400",
    tile: "bg-emerald-50 text-emerald-600",
    paper: "from-emerald-100 via-emerald-50 to-white",
  },
  blockers: {
    accent: "bg-rose-400",
    tile: "bg-rose-50 text-rose-600",
    paper: "from-rose-100 via-rose-50 to-white",
  },
  handover: {
    accent: "bg-amber-400",
    tile: "bg-amber-50 text-amber-600",
    paper: "from-amber-100 via-amber-50 to-white",
  },
};

const SORT_OPTIONS = [
  { id: "updated_desc", label: "Last updated" },
  { id: "date_desc", label: "Report date (newest)" },
  { id: "date_asc", label: "Report date (oldest)" },
  { id: "title_asc", label: "Title (A–Z)" },
];

function DocumentThumb({
  title,
  accent,
  paper,
}: {
  title: string;
  accent: string;
  paper: string;
}) {
  return (
    <div
      className={`relative h-28 overflow-hidden border-b border-gray-100 bg-gradient-to-br px-5 pt-4 ${paper}`}
    >
      <div className="h-full rounded-t-lg border border-gray-100 bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <span className={`block h-2 w-16 rounded-full ${accent}`} />
        <span className="mt-2.5 block truncate text-[10px] font-semibold text-gray-600">
          {title}
        </span>
        <div className="mt-2.5 space-y-1.5">
          <span className="block h-1.5 w-full rounded bg-gray-100" />
          <span className="block h-1.5 w-11/12 rounded bg-gray-100" />
          <span className="block h-1.5 w-4/5 rounded bg-gray-100" />
          <span className="block h-1.5 w-2/3 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

function TemplateTile({
  href,
  name,
  description,
  styleKey,
  templateId,
}: {
  href: string;
  name: string;
  description: string;
  styleKey: string;
  templateId?: DailyReportTemplate["id"];
}) {
  const style = TEMPLATE_STYLES[styleKey] ?? TEMPLATE_STYLES.blank;
  return (
    <Link
      href={href}
      className={`group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md ${style.ring}`}
    >
      <div className={`relative h-28 bg-gradient-to-br ${style.paper} p-3`}>
        <div className="flex h-full items-start rounded-md border border-gray-100 bg-white p-2.5 shadow-sm transition-transform group-hover:-translate-y-0.5">
          <div className="w-full">
            <span className={`block h-2 w-10 rounded-full ${style.bar}`} />
            <div className="mt-2 space-y-1.5">
              <span className="block h-1.5 w-full rounded bg-gray-100" />
              <span className="block h-1.5 w-10/12 rounded bg-gray-100" />
              <span className="block h-1.5 w-7/12 rounded bg-gray-100" />
            </div>
          </div>
        </div>
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          {templateId ? <LayoutTemplate className="h-3 w-3" /> : <FilePlus2 className="h-3 w-3" />}
          {templateId ? "Use template" : "Start blank"}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-violet-700">
          {name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
          {description}
        </p>
      </div>
    </Link>
  );
}

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
  const [view, setView] = useState<"grid" | "list">("grid");

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

  const counts = useMemo(
    () => ({
      drafts: reports.filter((report) => report.status === "DRAFT").length,
      submitted: reports.filter((report) => report.status === "SUBMITTED").length,
    }),
    [reports]
  );

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

  const resetView = () => {
    setSearch("");
    clearFilters();
  };

  const scrollToTemplates = () => {
    document.getElementById("report-templates")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const renderMenu = (report: DailyReportListItem) => (
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
  );

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
                aria-expanded={newMenuOpen}
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
                  <FilePlus2 className="h-4 w-4 text-gray-400" /> Blank report
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
                    <LayoutTemplate className="h-4 w-4 text-violet-400" /> {template.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        }
      />

      <section id="report-templates" className="mb-9 scroll-mt-24">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Start a new report</h2>
            <p className="text-xs text-gray-500">
              Pick a blank page or a ready-made template. Everything stays editable.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 sm:self-auto">
            <LayoutTemplate className="h-3.5 w-3.5" /> Blank + {DAILY_REPORT_TEMPLATES.length} templates
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <TemplateTile
            href="/daily-reporting/new"
            name="Blank report"
            description="A clean page for whatever the day brings."
            styleKey="blank"
          />
          {DAILY_REPORT_TEMPLATES.map((template) => (
            <TemplateTile
              key={template.id}
              href={`/daily-reporting/new?template=${template.id}`}
              name={template.name}
              description={template.description}
              styleKey={template.accent}
              templateId={template.id}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Recent reports</h2>
            <p className="text-xs text-gray-500">
              {reports.length} saved report{reports.length === 1 ? "" : "s"}
              {reports.length > 0 && (
                <>
                  {" "}
                  · {counts.drafts} draft{counts.drafts === 1 ? "" : "s"} · {counts.submitted} submitted
                </>
              )}
            </p>
          </div>

          <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === "grid" ? "bg-violet-50 text-violet-700" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Grid2X2 className="h-3.5 w-3.5" /> Grid
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === "list" ? "bg-violet-50 text-violet-700" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> List
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your reports..."
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

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((open) => !open)}
                aria-expanded={filterOpen}
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

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            {reports.length === 0 ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <NotebookPen className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Your first daily report starts here
                </h3>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-500">
                  Capture what your team worked on, what is blocked, and what comes next. Saved
                  reports will show up here so you can revisit or duplicate them any time.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Link href="/daily-reporting/new">
                    <Button>
                      <Plus className="h-4 w-4" /> Write a blank report
                    </Button>
                  </Link>
                  <Button variant="secondary" onClick={scrollToTemplates}>
                    <LayoutTemplate className="h-4 w-4" /> Browse templates
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={Search}
                title="No reports match your view"
                description="Try a different search term, status, template, or date range."
                action={
                  <Button variant="secondary" onClick={resetView}>
                    <X className="h-4 w-4" /> Clear search and filters
                  </Button>
                }
              />
            )}
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((report) => {
              const file = FILE_STYLES[report.template] ?? FILE_STYLES.blank;
              return (
                <div
                  key={report.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                >
                  <div className="absolute right-2 top-2 z-20 rounded-lg bg-white/90 backdrop-blur">
                    {renderMenu(report)}
                  </div>
                  <Link href={`/daily-reporting/${report.id}`} className="flex flex-1 flex-col">
                    <DocumentThumb
                      title={report.title}
                      accent={file.accent}
                      paper={file.paper}
                    />
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${file.tile}`}
                        >
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                            {report.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-gray-400">
                            {dailyReportTemplateLabel(report.template)} · {report.wordCount} word
                            {report.wordCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2.5 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-gray-500">
                        {report.excerpt || "No content yet — open the report to start writing."}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> {formatDate(report.reportDate)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" /> {formatRelativeTime(report.updatedAt)}
                        </span>
                      </div>
                      <div className="mt-2.5">{statusBadge(report.status)}</div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((report) => {
              const file = FILE_STYLES[report.template] ?? FILE_STYLES.blank;
              return (
                <div
                  key={report.id}
                  className="group relative flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                >
                  <Link
                    href={`/daily-reporting/${report.id}`}
                    className="flex min-w-0 flex-1 items-start gap-3.5"
                  >
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${file.tile}`}
                    >
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
                        <span>
                          {report.wordCount} word{report.wordCount === 1 ? "" : "s"}
                        </span>
                      </span>
                    </span>
                  </Link>
                  {renderMenu(report)}
                </div>
              );
            })}
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
