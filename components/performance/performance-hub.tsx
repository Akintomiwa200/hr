"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Hash,
  Medal,
  Pencil,
  Percent,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, Button, Card, EmptyState, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import type { Role } from "@prisma/client";
import { ORG_ROLES, roleLabel } from "@/lib/roles";
import type { WorkspaceMode } from "@/lib/role-workspace";
import { notify, readApiError } from "@/lib/toast";
import { cn, formatDate, fullName } from "@/lib/utils";
import { useAppEvents } from "@/hooks/use-app-events";

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

type Kpi = {
  id: string;
  title: string;
  description: string | null;
  metricType: string;
  targetValue: number | null;
  weight: number;
  roleFilter: string | null;
  department: { id?: string; name: string } | null;
};

type Cycle = {
  id: string;
  name: string;
  period: string;
  description: string | null;
  status: string;
  startDate: Date | string;
  endDate: Date | string;
  selfReviewDeadline: Date | string | null;
  managerReviewDeadline: Date | string | null;
  includeAllEmployees?: boolean;
  departmentIds?: string[] | string | null;
  roleFilters?: string[] | string | null;
  _count?: { appraisals: number };
  kpis: { kpi: { title: string } }[];
};

type Appraisal = {
  id: string;
  status: string;
  overallRating: number | null;
  selfSubmittedAt: Date | string | null;
  managerSubmittedAt: Date | string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
    department?: { id?: string; name: string } | null;
  };
  manager: { firstName: string; lastName: string };
  cycle: { id: string; name: string; period: string };
};

type Department = { id: string; name: string };

type PerformanceSettings = {
  ratingScaleMax: number;
  announceOnActivate: boolean;
  notifyOnActivate: boolean;
  requireSelfBeforeManager: boolean;
  autoOverallFromKpis: boolean;
};

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "SELF_REVIEW", label: "Self review" },
  { id: "MANAGER_REVIEW", label: "Manager review" },
  { id: "COMPLETED", label: "Completed" },
] as const;

const METRIC_META: Record<
  string,
  { label: string; hint: string; icon: typeof Star }
> = {
  RATING: { label: "Rating", hint: "Score on the rating scale", icon: Star },
  NUMBER: { label: "Number", hint: "Measured value vs target", icon: Hash },
  PERCENTAGE: { label: "Percentage", hint: "0–100% completion", icon: Percent },
  BOOLEAN: { label: "Yes / No", hint: "1 = met, 0 = missed", icon: CheckCircle2 },
};

function metricMeta(type: string) {
  return METRIC_META[type] ?? { label: type, hint: "Custom metric", icon: Target };
}

const ONBOARD_STEPS = [
  {
    title: "Define KPIs",
    body: "Set targets, weights, and who they apply to.",
  },
  {
    title: "Open a cycle",
    body: "Link KPIs, set deadlines, and activate enrollment.",
  },
  {
    title: "Review flow",
    body: "Employees self-appraise, then managers complete reviews.",
  },
] as const;

function statusProgress(status: string) {
  if (status === "COMPLETED") return 100;
  if (status === "MANAGER_REVIEW") return 66;
  if (status === "SELF_REVIEW") return 33;
  return 0;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-[#7B61FF]" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

function Ring({ value, size = 88, stroke = 9 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#7B61FF"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, value)) / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

function KpiCard({
  kpi,
  onEdit,
  onDelete,
  busy,
}: {
  kpi: Kpi;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const Meta = metricMeta(kpi.metricType);
  const Icon = Meta.icon;
  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-violet-100 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            kpi.metricType === "PERCENTAGE"
              ? "bg-emerald-50 text-emerald-600"
              : kpi.metricType === "BOOLEAN"
                ? "bg-sky-50 text-sky-600"
                : kpi.metricType === "NUMBER"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-violet-50 text-[#7B61FF]"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">{kpi.title}</h3>
          {kpi.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{kpi.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            title="Edit KPI"
            disabled={busy}
            onClick={onEdit}
            className="rounded-lg p-2 text-gray-400 hover:bg-violet-50 hover:text-violet-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Archive KPI"
            disabled={busy}
            onClick={onDelete}
            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-50/70 p-3 text-[12px]">
        <div>
          <p className="text-gray-400">Metric</p>
          <p className="mt-0.5 font-medium text-gray-800">{Meta.label}</p>
        </div>
        <div>
          <p className="text-gray-400">Target</p>
          <p className="mt-0.5 font-medium text-gray-800">
            {kpi.targetValue != null ? kpi.targetValue : "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-400">Weight</p>
          <p className="mt-0.5 font-semibold text-[#7B61FF]">{kpi.weight}x</p>
        </div>
        <div>
          <p className="text-gray-400">Scope</p>
          <p className="mt-0.5 truncate font-medium text-gray-800">
            {kpi.department?.name ?? (kpi.roleFilter ? roleLabel(kpi.roleFilter as Role) : "Everyone")}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-gray-400">Relative weight</span>
          <span className="font-semibold text-gray-600">
            {kpi.weight >= 1.5 ? "High impact" : kpi.weight >= 1 ? "Standard" : "Low impact"}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              "h-full rounded-full",
              kpi.weight >= 1.5 ? "bg-[#7B61FF]" : kpi.weight >= 1 ? "bg-violet-400" : "bg-gray-300"
            )}
            style={{ width: `${Math.min(100, Math.max(15, (kpi.weight / 2) * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function PerformanceHub({
  kpis: initialKpis,
  cycles: initialCycles,
  appraisals: initialAppraisals,
  departments: initialDepartments,
  canManage,
  canManageSettings,
  isEmployee,
  mode = isEmployee ? "self" : canManage ? "org" : "team",
  currentEmployeeId,
  settings: initialSettings,
}: {
  kpis: Kpi[];
  cycles: Cycle[];
  appraisals: Appraisal[];
  departments: Department[];
  canManage: boolean;
  canManageSettings: boolean;
  isEmployee: boolean;
  mode?: WorkspaceMode;
  currentEmployeeId?: string;
  stats?: { activeCycles: number; pendingSelf: number; pendingManager: number; completed: number; kpiCount: number };
  settings: PerformanceSettings;
}) {
  const [tab, setTab] = useState<
    "appraisals" | "cycles" | "kpis" | "insights" | "settings"
  >("appraisals");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [kpiSearch, setKpiSearch] = useState("");
  const [kpiOpen, setKpiOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [kpis, setKpis] = useState<Kpi[]>(initialKpis);
  const [cycles, setCycles] = useState<Cycle[]>(initialCycles);
  const [appraisals, setAppraisals] = useState<Appraisal[]>(initialAppraisals);
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [settings, setSettings] = useState<PerformanceSettings>(initialSettings);

  const [kpiForm, setKpiForm] = useState({
    title: "",
    description: "",
    metricType: "RATING",
    targetValue: "",
    weight: "1",
    departmentId: "",
    roleFilter: "",
  });

  const [cycleForm, setCycleForm] = useState({
    name: "",
    period: "",
    description: "",
    startDate: "",
    endDate: "",
    selfReviewDeadline: "",
    managerReviewDeadline: "",
    includeAllEmployees: true,
    departmentIds: [] as string[],
    roleFilters: [] as string[],
    kpiIds: [] as string[],
  });

  const [settingsForm, setSettingsForm] = useState({
    ratingScaleMax: initialSettings.ratingScaleMax,
    announceOnActivate: initialSettings.announceOnActivate,
    notifyOnActivate: initialSettings.notifyOnActivate,
    requireSelfBeforeManager: initialSettings.requireSelfBeforeManager,
    autoOverallFromKpis: initialSettings.autoOverallFromKpis,
  });

  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reload = useCallback(() => {
    if (reloadTimer.current) return;
    reloadTimer.current = setTimeout(async () => {
      reloadTimer.current = null;
      try {
        const res = await fetch("/api/performance/hub");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.kpis)) setKpis(data.kpis);
        if (Array.isArray(data.cycles)) setCycles(data.cycles);
        if (Array.isArray(data.appraisals)) setAppraisals(data.appraisals);
        if (Array.isArray(data.departments)) setDepartments(data.departments);
        if (data.settings) {
          setSettings(data.settings);
          setSettingsForm((prev) => ({
            ...prev,
            ratingScaleMax: data.settings.ratingScaleMax ?? prev.ratingScaleMax,
            announceOnActivate: data.settings.announceOnActivate ?? prev.announceOnActivate,
            notifyOnActivate: data.settings.notifyOnActivate ?? prev.notifyOnActivate,
            requireSelfBeforeManager:
              data.settings.requireSelfBeforeManager ?? prev.requireSelfBeforeManager,
            autoOverallFromKpis: data.settings.autoOverallFromKpis ?? prev.autoOverallFromKpis,
          }));
        }
      } catch {
        /* ignore transient failures */
      }
    }, 400);
  }, []);

  useAppEvents({
    types: ["performance_updated", "appraisal_updated", "settings_updated", "notification_updated"],
    onEvent: reload,
  });

  useEffect(() => {
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, []);

  const ratingMax = settings.ratingScaleMax || 5;
  const activeCycle = cycles.find((c) => c.status === "ACTIVE");
  const myAppraisal = currentEmployeeId
    ? appraisals.find((a) => a.employee.id === currentEmployeeId)
    : null;
  const teamAppraisals = useMemo(
    () =>
      currentEmployeeId
        ? appraisals.filter((a) => a.employee.id !== currentEmployeeId)
        : appraisals,
    [appraisals, currentEmployeeId]
  );
  const isTeamLeadView = mode === "team" && !canManage;

  const filteredAppraisals = useMemo(() => {
    if (statusFilter === "ALL") return appraisals;
    return appraisals.filter((a) => a.status === statusFilter);
  }, [appraisals, statusFilter]);

  const filteredKpis = useMemo(() => {
    const q = kpiSearch.trim().toLowerCase();
    if (!q) return kpis;
    return kpis.filter(
      (k) =>
        k.title.toLowerCase().includes(q) ||
        (k.description ?? "").toLowerCase().includes(q) ||
        (k.department?.name ?? "").toLowerCase().includes(q)
    );
  }, [kpis, kpiSearch]);

  const insights = useMemo(() => {
    const total = appraisals.length;
    const byStatus: Record<string, number> = {};
    for (const a of appraisals) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    const completed = byStatus.COMPLETED ?? 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const rated = appraisals.filter((a) => a.overallRating != null);
    const avgRating =
      rated.length > 0
        ? Math.round(
            (rated.reduce((s, a) => s + (a.overallRating ?? 0), 0) / rated.length) * 10
          ) / 10
        : null;
    const byDepartment: Record<string, number> = {};
    for (const a of appraisals) {
      const name = a.employee.department?.name;
      if (name) byDepartment[name] = (byDepartment[name] ?? 0) + 1;
    }
    return {
      total,
      completed,
      completionRate,
      byStatus,
      avgRating,
      byDepartment,
      pendingSelf: byStatus.SELF_REVIEW ?? 0,
      pendingManager: byStatus.MANAGER_REVIEW ?? 0,
    };
  }, [appraisals]);

  const activeCycleCompletion = useMemo(() => {
    if (!activeCycle) return 0;
    const list = appraisals.filter((a) => a.cycle.id === activeCycle.id);
    if (list.length === 0) return 0;
    return Math.round(
      (list.filter((a) => a.status === "COMPLETED").length / list.length) * 100
    );
  }, [activeCycle, appraisals]);

  const openCreateKpi = () => {
    setEditingKpi(null);
    setKpiForm({
      title: "",
      description: "",
      metricType: "RATING",
      targetValue: "",
      weight: "1",
      departmentId: "",
      roleFilter: "",
    });
    setKpiOpen(true);
  };

  const openEditKpi = (kpi: Kpi) => {
    setEditingKpi(kpi);
    setKpiForm({
      title: kpi.title,
      description: kpi.description ?? "",
      metricType: kpi.metricType,
      targetValue: kpi.targetValue != null ? String(kpi.targetValue) : "",
      weight: String(kpi.weight),
      departmentId: kpi.department?.id ?? "",
      roleFilter: kpi.roleFilter ?? "",
    });
    setKpiOpen(true);
  };

  const saveKpi = async () => {
    if (!kpiForm.title.trim()) {
      notify.error("KPI title is required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        editingKpi ? `/api/performance/kpis/${editingKpi.id}` : "/api/performance/kpis",
        {
          method: editingKpi ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(kpiForm),
        }
      );
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save KPI"));
        return;
      }
      notify.success(editingKpi ? "KPI updated" : "KPI created successfully");
      setKpiOpen(false);
      setEditingKpi(null);
      reload();
    } catch {
      notify.error("Failed to save KPI");
    } finally {
      setBusy(false);
    }
  };

  const deleteKpi = async (id: string) => {
    if (!confirm("Archive this KPI? It will be hidden from the library.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/performance/kpis/${id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to archive KPI"));
        return;
      }
      notify.success("KPI archived");
      reload();
    } catch {
      notify.error("Failed to archive KPI");
    } finally {
      setBusy(false);
    }
  };

  const createCycle = async () => {
    if (!cycleForm.name.trim() || !cycleForm.period.trim()) {
      notify.error("Cycle name and period are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...cycleForm,
        departmentIds: cycleForm.includeAllEmployees ? [] : cycleForm.departmentIds,
        roleFilters: cycleForm.includeAllEmployees ? [] : cycleForm.roleFilters,
      };
      const res = await fetch("/api/performance/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create review cycle"));
        return;
      }
      notify.success("Review cycle created successfully");
      setCycleOpen(false);
      setCycleForm({
        name: "",
        period: "",
        description: "",
        startDate: "",
        endDate: "",
        selfReviewDeadline: "",
        managerReviewDeadline: "",
        includeAllEmployees: true,
        departmentIds: [],
        roleFilters: [],
        kpiIds: [],
      });
      reload();
    } catch {
      notify.error("Failed to create review cycle");
    } finally {
      setBusy(false);
    }
  };

  const activateCycle = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/performance/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to activate cycle"));
      } else {
        notify.success("Review cycle activated");
        reload();
      }
    } catch {
      notify.error("Failed to activate cycle");
    } finally {
      setBusy(false);
    }
  };

  const closeCycle = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/performance/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to close cycle"));
      } else {
        notify.success("Review cycle closed");
        reload();
      }
    } catch {
      notify.error("Failed to close cycle");
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/performance/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settingsForm,
          ratingScaleMax: Math.min(10, Math.max(3, Number(settingsForm.ratingScaleMax) || 5)),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save settings"));
        return;
      }
      notify.success("Performance settings saved");
      reload();
    } catch {
      notify.error("Failed to save settings");
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    {
      id: "appraisals" as const,
      label: isEmployee ? "My appraisal" : isTeamLeadView ? "Team reviews" : "Appraisals",
      icon: ClipboardCheck,
    },
    ...(canManage ? [{ id: "cycles" as const, label: "Review cycles", icon: CalendarRange }] : []),
    ...(canManage ? [{ id: "kpis" as const, label: "KPI library", icon: Target }] : []),
    ...(canManage ? [{ id: "insights" as const, label: "Insights", icon: BarChart3 }] : []),
    ...(canManageSettings ? [{ id: "settings" as const, label: "Settings", icon: Settings }] : []),
  ];

  return (
    <>
      {/* Command band */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7B61FF] via-[#8B5CF6] to-brand-600 p-6 sm:p-7 shadow-[0_12px_40px_-12px_rgba(123,97,255,0.45)]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-purple-300/20 blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                {isEmployee
                  ? "Your performance"
                  : isTeamLeadView
                    ? "Team performance"
                    : "Performance overview"}
              </p>
              <h2 className="mt-1.5 text-2xl font-bold text-white">
                {isEmployee
                  ? "Track your reviews & ratings"
                  : isTeamLeadView
                    ? "Guide your team to completion"
                    : "Run review cycles end to end"}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-white/75">
                {isEmployee
                  ? "Complete your self-appraisal and see scored results update in real time."
                  : isTeamLeadView
                    ? "See who still needs to self-appraise and score the appraisals awaiting your input."
                    : "Configure KPIs, activate cycles, score appraisals, and publish results — all live."}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white">
              <Activity className="h-3 w-3" />
              Live
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ...(canManage
                ? [
                    { label: "Active cycles", value: cycles.filter((c) => c.status === "ACTIVE").length, icon: CalendarRange as LucideIcon },
                    { label: "Awaiting self", value: insights.pendingSelf, icon: UserCheck as LucideIcon },
                    { label: "Awaiting manager", value: insights.pendingManager, icon: Users as LucideIcon },
                    { label: "Completed", value: insights.completed, icon: CheckCircle2 as LucideIcon },
                  ]
                : isTeamLeadView
                  ? [
                      { label: "Team reviews", value: teamAppraisals.length, icon: Users as LucideIcon },
                      { label: "Awaiting your score", value: teamAppraisals.filter((a) => a.status === "MANAGER_REVIEW").length, icon: ClipboardCheck as LucideIcon },
                      { label: "In self-review", value: teamAppraisals.filter((a) => a.status === "SELF_REVIEW").length, icon: UserCheck as LucideIcon },
                      { label: "Completed", value: teamAppraisals.filter((a) => a.status === "COMPLETED").length, icon: CheckCircle2 as LucideIcon },
                    ]
                  : [
                      { label: "My reviews", value: appraisals.length, icon: Medal as LucideIcon },
                      { label: "Pending action", value: myAppraisal?.status === "SELF_REVIEW" ? 1 : 0, icon: Sparkles as LucideIcon },
                      { label: "Completed", value: appraisals.filter((a) => a.status === "COMPLETED").length, icon: CheckCircle2 as LucideIcon },
                      { label: "Overall rating", value: myAppraisal?.overallRating != null ? `${myAppraisal.overallRating}/${ratingMax}` : "—", icon: TrendingUp as LucideIcon },
                    ]),
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm"
              >
                <m.icon className="h-4 w-4 text-white/80" />
                <p className="mt-2.5 text-2xl font-extrabold tabular-nums text-white">{m.value}</p>
                <p className="mt-0.5 text-[11px] font-medium text-white/70">{m.label}</p>
              </div>
            ))}
          </div>

          {canManage && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setCycleOpen(true)}
                className="bg-white text-violet-700 hover:bg-violet-50"
              >
                <Plus className="h-4 w-4" />
                New review cycle
              </Button>
              <Button
                variant="ghost"
                onClick={openCreateKpi}
                className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <Target className="h-4 w-4" />
                Create KPI
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Active cycle banner */}
      {activeCycle ? (
        <div className="mb-6 mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/90 to-white shadow-sm">
          <div className="flex flex-wrap items-center gap-5 p-5">
            <Ring value={activeCycleCompletion} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#7B61FF]">
                <Activity className="h-3.5 w-3.5" />
                Active review cycle
              </p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">{activeCycle.name}</h2>
              <p className="text-sm text-gray-500">{activeCycle.period}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                <span>
                  {formatDate(activeCycle.startDate)} – {formatDate(activeCycle.endDate)}
                </span>
                <span>
                  {activeCycle._count?.appraisals ?? 0} people · {activeCycle.kpis.length} KPIs
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage && (
                <Link href={`/performance/cycles/${activeCycle.id}`}>
                  <Button variant="secondary">
                    View cycle
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {myAppraisal && myAppraisal.status === "SELF_REVIEW" && (
                <Link href={`/performance/appraisals/${myAppraisal.id}`}>
                  <Button>
                    Complete self-appraisal
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        !isEmployee && canManage && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B61FF] to-brand-500 text-white shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">No active performance cycle</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Define KPIs, open a review cycle, then activate it to enroll your team.
                  </p>
                </div>
              </div>
              <Button onClick={() => setTab("cycles")}>
                Set up a cycle
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      )}

      {/* Tab shell */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors",
                  tab === t.id
                    ? "bg-white text-[#7B61FF] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {canManage && tab === "cycles" && (
              <Button size="sm" onClick={() => setCycleOpen(true)}>
                <Plus className="h-4 w-4" />
                New cycle
              </Button>
            )}
            {canManage && tab === "kpis" && (
              <Button size="sm" onClick={openCreateKpi}>
                <Plus className="h-4 w-4" />
                Create KPI
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* ============ APPRAISALS ============ */}
          {tab === "appraisals" && (
            <>
              {isTeamLeadView && myAppraisal && (
                <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50/20 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                        Your own appraisal
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {myAppraisal.cycle.name}
                      </p>
                      <div className="mt-2">{statusBadge(myAppraisal.status)}</div>
                    </div>
                    <Link href={`/performance/appraisals/${myAppraisal.id}`}>
                      <Button variant="secondary">Open mine</Button>
                    </Link>
                  </div>
                </div>
              )}

              {isEmployee && myAppraisal && (
                <div className="mb-5 rounded-2xl border-2 border-[#7B61FF]/20 bg-violet-50/30 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#7B61FF]">
                        Your current appraisal
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">
                        {myAppraisal.cycle.name}
                      </h3>
                      <p className="text-sm text-gray-500">{myAppraisal.cycle.period}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        Reviewer: {fullName(myAppraisal.manager.firstName, myAppraisal.manager.lastName)}
                      </p>
                      <div className="mt-4 flex items-center gap-1.5">
                        {["SELF_REVIEW", "MANAGER_REVIEW", "COMPLETED"].map((step, i) => {
                          const activeIdx =
                            myAppraisal.status === "COMPLETED"
                              ? 3
                              : myAppraisal.status === "MANAGER_REVIEW"
                                ? 2
                                : 1;
                          const done = i < activeIdx;
                          const active = i === activeIdx - 1;
                          return (
                            <div key={step} className="flex flex-1 flex-col items-center gap-1">
                              <div
                                className={cn(
                                  "h-1.5 w-full rounded-full",
                                  done ? "bg-emerald-500" : active ? "bg-[#7B61FF]" : "bg-gray-200"
                                )}
                              />
                              <span
                                className={cn(
                                  "text-[10px] font-medium",
                                  done
                                    ? "text-emerald-600"
                                    : active
                                      ? "text-[#7B61FF]"
                                      : "text-gray-400"
                                )}
                              >
                                {step === "SELF_REVIEW"
                                  ? "Self"
                                  : step === "MANAGER_REVIEW"
                                    ? "Manager"
                                    : "Done"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      {statusBadge(myAppraisal.status)}
                      {myAppraisal.overallRating != null && (
                        <div className="mt-3">
                          <p className="text-2xl font-bold text-emerald-600">
                            {myAppraisal.overallRating}/{ratingMax}
                          </p>
                          <div className="mt-1 flex items-center justify-end gap-0.5">
                            {Array.from({ length: ratingMax }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-4 w-4",
                                  i < myAppraisal.overallRating!
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-200"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      <Link
                        href={`/performance/appraisals/${myAppraisal.id}`}
                        className="mt-4 inline-block"
                      >
                        <Button>
                          {myAppraisal.status === "SELF_REVIEW"
                            ? "Start self-appraisal"
                            : "View appraisal"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {(canManage || isTeamLeadView) && !isEmployee && (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
                        statusFilter === f.id
                          ? "border-[#7B61FF] bg-[#7B61FF] text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-violet-200"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}

              {filteredAppraisals.length === 0 ? (
                canManage ? (
                  <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-brand-50/40">
                    <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 md:grid-cols-[1.15fr_1fr] md:items-center">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#7B61FF]">
                          Ready to launch
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-gray-900">
                          Start your first review cycle
                        </h3>
                        <p className="mt-1.5 text-sm text-gray-500">
                          Create KPIs, open a review cycle, then activate it to enroll your team.
                          Appraisals land here and update in real time as people submit them.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button onClick={openCreateKpi}>
                            <Target className="h-4 w-4" />
                            Create KPIs
                          </Button>
                          <Button variant="secondary" onClick={() => setTab("cycles")}>
                            Open a review cycle
                          </Button>
                        </div>
                      </div>
                      <ol className="space-y-3">
                        {ONBOARD_STEPS.map((s, i) => (
                          <li key={s.title} className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B61FF] to-brand-500 text-sm font-bold text-white shadow-sm">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                              <p className="text-xs text-gray-500">{s.body}</p>
                            </div>
                            {i < ONBOARD_STEPS.length - 1 && (
                              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-violet-300" />
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={ClipboardCheck}
                    title="No appraisals yet"
                    description="Appraisals appear here when HR opens a review cycle."
                  />
                )
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase text-gray-500">
                          {isEmployee ? "Cycle" : "Appraisee"}
                        </th>
                        <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase text-gray-500">
                          Cycle
                        </th>
                        <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase text-gray-500">
                          Manager
                        </th>
                        <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase text-gray-500">
                          Progress
                        </th>
                        <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase text-gray-500">
                          Rating
                        </th>
                        <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase text-gray-500">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAppraisals.map((appraisal) => (
                        <tr key={appraisal.id} className="transition-colors hover:bg-gray-50/60">
                          <td className="px-3 py-3.5">
                            {!isEmployee ? (
                              <div className="flex items-center gap-3">
                                <Avatar
                                  firstName={appraisal.employee.firstName}
                                  lastName={appraisal.employee.lastName}
                                  src={appraisal.employee.avatar}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-gray-900">
                                    {fullName(
                                      appraisal.employee.firstName,
                                      appraisal.employee.lastName
                                    )}
                                  </p>
                                  {appraisal.employee.department?.name && (
                                    <p className="truncate text-[11px] text-gray-400">
                                      {appraisal.employee.department.name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-gray-900">
                                  {appraisal.cycle.name}
                                </p>
                                <p className="text-xs text-gray-500">{appraisal.cycle.period}</p>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3.5 text-gray-600">
                            <p className="font-medium text-gray-800">{appraisal.cycle.name}</p>
                            <p className="text-xs text-gray-400">{appraisal.cycle.period}</p>
                          </td>
                          <td className="px-3 py-3.5 text-[13px] text-gray-600">
                            {fullName(appraisal.manager.firstName, appraisal.manager.lastName)}
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="w-32">
                              <div className="mb-1 flex items-center justify-between text-[11px]">
                                <span className="font-medium text-gray-700">
                                  {statusProgress(appraisal.status)}%
                                </span>
                              </div>
                              <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-100">
                                {[33, 33, 34].map((w, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      i === 0 && "rounded-l-full",
                                      i === 2 && "rounded-r-full",
                                      statusProgress(appraisal.status) > i * 33
                                        ? "bg-emerald-500"
                                        : "bg-gray-100"
                                    )}
                                    style={{ width: `${w}%` }}
                                  />
                                ))}
                              </div>
                              <div className="mt-1">{statusBadge(appraisal.status)}</div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            {appraisal.overallRating != null ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-emerald-600">
                                  {appraisal.overallRating}/{ratingMax}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            <Link
                              href={`/performance/appraisals/${appraisal.id}`}
                              className="inline-flex items-center gap-1 text-[13px] font-medium text-[#7B61FF] hover:text-violet-700"
                            >
                              {appraisal.status === "SELF_REVIEW" &&
                              appraisal.employee.id === currentEmployeeId
                                ? "Self-review"
                                : appraisal.status === "MANAGER_REVIEW" && canManage
                                  ? "Review"
                                  : "Open"}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ============ CYCLES ============ */}
          {tab === "cycles" && canManage && (
            <div className="space-y-4">
              {cycles.length === 0 ? (
                <EmptyState
                  icon={CalendarRange}
                  title="No review cycles"
                  description="Start a cycle to run KPI-based appraisals across your organization."
                />
              ) : (
                cycles.map((cycle) => {
                  const cycleApps = appraisals.filter((a) => a.cycle.id === cycle.id);
                  const completedApps = cycleApps.filter((a) => a.status === "COMPLETED").length;
                  const completion =
                    cycleApps.length > 0
                      ? Math.round((completedApps / cycleApps.length) * 100)
                      : 0;
                  return (
                    <div
                      key={cycle.id}
                      className="rounded-2xl border border-gray-100 p-5 shadow-sm transition-all hover:border-violet-100 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-gray-900">
                              {cycle.name}
                            </h3>
                            {statusBadge(cycle.status)}
                          </div>
                          <p className="mt-1 text-sm text-gray-500">{cycle.period}</p>
                          {cycle.description && (
                            <p className="mt-2 line-clamp-2 text-xs text-gray-600">
                              {cycle.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-500">
                            <span>
                              {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
                            </span>
                            <span>{cycle._count?.appraisals ?? 0} people</span>
                            <span>{cycle.kpis.length} KPIs</span>
                            {cycle.includeAllEmployees === false && (
                              <span className="text-[#7B61FF]">Scoped enrollment</span>
                            )}
                          </div>
                          {cycleApps.length > 0 && (
                            <div className="mt-3 max-w-sm">
                              <div className="mb-1 flex items-center justify-between text-[11px]">
                                <span className="text-gray-400">Completion</span>
                                <span className="font-semibold text-gray-700">{completion}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${completion}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {cycle.kpis.slice(0, 4).map((link) => (
                              <span
                                key={link.kpi.title}
                                className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700"
                              >
                                {link.kpi.title}
                              </span>
                            ))}
                            {cycle.kpis.length > 4 && (
                              <span className="text-[11px] text-gray-400">
                                +{cycle.kpis.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                          <Link href={`/performance/cycles/${cycle.id}`}>
                            <Button variant="secondary" className="w-full sm:w-auto">
                              Details
                            </Button>
                          </Link>
                          {cycle.status === "DRAFT" && (
                            <Button
                              loading={busy}
                              onClick={() => activateCycle(cycle.id)}
                              className="w-full sm:w-auto"
                            >
                              Activate
                            </Button>
                          )}
                          {cycle.status === "ACTIVE" && (
                            <Button
                              variant="secondary"
                              loading={busy}
                              onClick={() => closeCycle(cycle.id)}
                              className="w-full sm:w-auto"
                            >
                              Close
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ============ KPI LIBRARY ============ */}
          {tab === "kpis" && canManage && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={kpiSearch}
                    onChange={(e) => setKpiSearch(e.target.value)}
                    placeholder="Search KPIs…"
                    className="w-60 rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-[13px] text-gray-700 focus:border-[#7B61FF] focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                  />
                </div>
                <div className="flex-1" />
                <span className="text-[12px] text-gray-400">{kpis.length} KPIs in library</span>
              </div>
              {filteredKpis.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title={kpiSearch ? "No matching KPIs" : "No KPIs defined"}
                  description={
                    kpiSearch
                      ? "Try a different search term."
                      : "Create measurable KPIs with targets and weights before starting a review cycle."
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredKpis.map((kpi) => (
                    <KpiCard
                      key={kpi.id}
                      kpi={kpi}
                      busy={busy}
                      onEdit={() => openEditKpi(kpi)}
                      onDelete={() => deleteKpi(kpi.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ============ INSIGHTS ============ */}
          {tab === "insights" && canManage && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-5">
                  <div className="mb-2 flex items-center gap-2 text-[#7B61FF]">
                    <Percent className="h-4 w-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">
                      Completion
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{insights.completionRate}%</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {insights.completed} of {insights.total} appraisals done
                  </p>
                </Card>
                <Card className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-amber-500">
                    <Star className="h-4 w-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Avg rating
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {insights.avgRating != null ? insights.avgRating : "—"}
                    {insights.avgRating != null && (
                      <span className="text-base font-medium text-gray-400">/{ratingMax}</span>
                    )}
                  </p>
                </Card>
                <Card className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-[#7B61FF]">
                    <UserCheck className="h-4 w-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Pending self
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{insights.pendingSelf}</p>
                  <p className="mt-1 text-xs text-gray-500">Awaiting employee review</p>
                </Card>
                <Card className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-[#7B61FF]">
                    <Users className="h-4 w-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Pending manager
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{insights.pendingManager}</p>
                  <p className="mt-1 text-xs text-gray-500">Awaiting manager review</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">By appraisal status</h3>
                  {insights.total === 0 ? (
                    <p className="text-sm text-gray-400">No appraisal data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {(
                        [
                          { key: "SELF_REVIEW", label: "Self review", color: "bg-[#7B61FF]" },
                          { key: "MANAGER_REVIEW", label: "Manager review", color: "bg-amber-500" },
                          { key: "COMPLETED", label: "Completed", color: "bg-emerald-500" },
                          { key: "NOT_STARTED", label: "Not started", color: "bg-gray-200" },
                        ] as const
                      ).map((row) => {
                        const count = insights.byStatus[row.key] ?? 0;
                        const pct = insights.total > 0 ? Math.round((count / insights.total) * 100) : 0;
                        return (
                          <div key={row.key}>
                            <div className="mb-1 flex items-center justify-between text-[13px]">
                              <span className="text-gray-700">{row.label}</span>
                              <span className="font-medium text-gray-900">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${row.color}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">
                    Completion by review cycle
                  </h3>
                  {cycles.length === 0 ? (
                    <p className="text-sm text-gray-400">No cycles yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {cycles.slice(0, 6).map((cycle) => {
                        const cycleApps = appraisals.filter((a) => a.cycle.id === cycle.id);
                        const done = cycleApps.filter((a) => a.status === "COMPLETED").length;
                        const pct =
                          cycleApps.length > 0 ? Math.round((done / cycleApps.length) * 100) : 0;
                        return (
                          <div key={cycle.id}>
                            <div className="mb-1 flex items-center justify-between text-[12.5px]">
                              <span className="truncate font-medium text-gray-700">
                                {cycle.name}
                              </span>
                              <span className="ml-3 shrink-0 text-gray-500">
                                {done}/{cycleApps.length || cycle._count?.appraisals || 0}
                              </span>
                            </div>
                            <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#7B61FF] to-violet-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {Object.keys(insights.byDepartment).length > 0 && (
                <Card className="p-5">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">
                    Appraisals by department
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(insights.byDepartment)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, count]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-xl border border-gray-100 bg-violet-50/30 px-4 py-3"
                        >
                          <span className="truncate text-sm font-medium text-gray-800">{name}</span>
                          <span className="text-sm font-bold text-[#7B61FF]">{count}</span>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ============ SETTINGS ============ */}
          {tab === "settings" && canManageSettings && (
            <div className="max-w-2xl space-y-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Performance settings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Control rating scale, activation announcements, and review workflow rules.
                </p>
              </div>

              <Card className="space-y-1 p-5">
                <label className={labelClass}>Rating scale maximum (3–10)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={3}
                    max={10}
                    className={`${inputClass} max-w-[140px]`}
                    value={settingsForm.ratingScaleMax}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        ratingScaleMax: Number(e.target.value),
                      })
                    }
                  />
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: Math.max(3, Math.min(10, settingsForm.ratingScaleMax)) }).map(
                      (_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-amber-400 text-amber-400"
                        />
                      )
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  Overall ratings and KPI rating metrics use this scale. Changes apply instantly.
                </p>
              </Card>

              {(
                [
                  {
                    key: "announceOnActivate" as const,
                    title: "Announce on activate",
                    body: "Post a company announcement when a review cycle is activated.",
                  },
                  {
                    key: "notifyOnActivate" as const,
                    title: "Notify on activate",
                    body: "Send in-app notifications to enrolled employees and managers.",
                  },
                  {
                    key: "requireSelfBeforeManager" as const,
                    title: "Require self-review first",
                    body: "Managers cannot submit until the employee completes self-review.",
                  },
                  {
                    key: "autoOverallFromKpis" as const,
                    title: "Auto-calculate overall from KPIs",
                    body: "Derive overall rating from weighted KPI scores when available.",
                  },
                ] as const
              ).map((item) => (
                <Card key={item.key} className="border-violet-100 bg-violet-50/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{item.body}</p>
                    </div>
                    <Toggle
                      checked={settingsForm[item.key]}
                      onChange={(value) =>
                        setSettingsForm({ ...settingsForm, [item.key]: value })
                      }
                    />
                  </div>
                </Card>
              ))}

              <div className="flex items-center justify-end gap-3">
                <span className="text-[12px] text-gray-400">
                  {settingsForm.ratingScaleMax !== settings.ratingScaleMax ||
                  settingsForm.announceOnActivate !== settings.announceOnActivate ||
                  settingsForm.notifyOnActivate !== settings.notifyOnActivate ||
                  settingsForm.requireSelfBeforeManager !== settings.requireSelfBeforeManager ||
                  settingsForm.autoOverallFromKpis !== settings.autoOverallFromKpis
                    ? "Unsaved changes"
                    : "All changes saved"}
                </span>
                <Button loading={busy} onClick={saveSettings}>
                  Save settings
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How it works (only once there is real activity) */}
      {canManage && tab === "appraisals" && filteredAppraisals.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">How a review cycle runs</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              The lifecycle every appraisal moves through — tracked live on this page.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            {ONBOARD_STEPS.map((s, i) => (
              <div key={s.title} className="flex flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B61FF] to-brand-500 text-sm font-bold text-white shadow-sm">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.body}</p>
                </div>
                {i < ONBOARD_STEPS.length - 1 && (
                  <ArrowRight className="ml-1 hidden h-4 w-4 shrink-0 text-gray-300 sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ KPI DIALOG ============ */}
      <Dialog
        open={kpiOpen}
        onClose={() => {
          setKpiOpen(false);
          setEditingKpi(null);
        }}
        title={editingKpi ? "Edit KPI" : "Create KPI"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input
              className={inputClass}
              placeholder="e.g. Delivery quality"
              value={kpiForm.title}
              onChange={(e) => setKpiForm({ ...kpiForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={2}
              value={kpiForm.description}
              onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Metric type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(METRIC_META).map(([type, meta]) => {
                const Icon = meta.icon;
                const active = kpiForm.metricType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setKpiForm({ ...kpiForm, metricType: type })}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-[#7B61FF] bg-violet-50/60 ring-1 ring-[#7B61FF]/30"
                        : "border-gray-200 bg-white hover:border-violet-200"
                    )}
                  >
                    <Icon
                      className={cn("h-4 w-4", active ? "text-[#7B61FF]" : "text-gray-400")}
                    />
                    <p className="mt-1.5 text-[12.5px] font-semibold text-gray-900">
                      {meta.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-tight text-gray-400">{meta.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Target value</label>
              <input
                className={inputClass}
                value={kpiForm.targetValue}
                placeholder={kpiForm.metricType === "PERCENTAGE" ? "e.g. 90" : kpiForm.metricType === "BOOLEAN" ? "1 or 0" : "e.g. 50"}
                onChange={(e) => setKpiForm({ ...kpiForm, targetValue: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Weight</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                className={inputClass}
                value={kpiForm.weight}
                onChange={(e) => setKpiForm({ ...kpiForm, weight: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Department (optional)</label>
              <select
                className={inputClass}
                value={kpiForm.departmentId}
                onChange={(e) => setKpiForm({ ...kpiForm, departmentId: e.target.value })}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Role (optional)</label>
              <select
                className={inputClass}
                value={kpiForm.roleFilter}
                onChange={(e) => setKpiForm({ ...kpiForm, roleFilter: e.target.value })}
              >
                <option value="">All roles</option>
                {ORG_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="font-medium text-gray-600">Relative weight</span>
              <span className="font-semibold text-gray-900">
                {Number(kpiForm.weight) >= 1.5
                  ? "High impact"
                  : Number(kpiForm.weight) >= 1
                    ? "Standard"
                    : "Low impact"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-[#7B61FF] transition-all"
                style={{
                  width: `${Math.min(100, Math.max(15, (Number(kpiForm.weight || 1) / 2) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              {(metricMeta(kpiForm.metricType) as { hint: string }).hint}. Weight multiplies a KPI&apos;s
              contribution to the overall score.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setKpiOpen(false)}>
            Cancel
          </Button>
          <Button loading={busy} onClick={saveKpi}>
            {editingKpi ? "Save changes" : "Create KPI"}
          </Button>
        </div>
      </Dialog>

      {/* ============ CYCLE DIALOG ============ */}
      <Dialog open={cycleOpen} onClose={() => setCycleOpen(false)} title="New review cycle" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cycle name</label>
              <input
                className={inputClass}
                value={cycleForm.name}
                onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Period</label>
              <input
                className={inputClass}
                placeholder="H1 2026"
                value={cycleForm.period}
                onChange={(e) => setCycleForm({ ...cycleForm, period: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={2}
              value={cycleForm.description}
              onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start date</label>
              <input
                type="date"
                className={inputClass}
                value={cycleForm.startDate}
                onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>End date</label>
              <input
                type="date"
                className={inputClass}
                value={cycleForm.endDate}
                onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Self-review deadline</label>
              <input
                type="date"
                className={inputClass}
                value={cycleForm.selfReviewDeadline}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, selfReviewDeadline: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Manager deadline</label>
              <input
                type="date"
                className={inputClass}
                value={cycleForm.managerReviewDeadline}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, managerReviewDeadline: e.target.value })
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className={labelClass}>KPIs in this cycle</p>
              <span className="text-[11px] font-medium text-gray-400">
                {cycleForm.kpiIds.length} selected
              </span>
            </div>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {kpis.map((kpi) => {
                const selected = cycleForm.kpiIds.includes(kpi.id);
                return (
                  <label
                    key={kpi.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                      selected
                        ? "border-violet-200 bg-violet-50/50 text-gray-900"
                        : "border-gray-100 text-gray-700 hover:border-violet-100"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="accent-[#7B61FF]"
                      checked={selected}
                      onChange={(e) =>
                        setCycleForm({
                          ...cycleForm,
                          kpiIds: e.target.checked
                            ? [...cycleForm.kpiIds, kpi.id]
                            : cycleForm.kpiIds.filter((id) => id !== kpi.id),
                        })
                      }
                    />
                    <span className="flex-1 truncate">{kpi.title}</span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      {kpi.weight}x
                    </span>
                  </label>
                );
              })}
              {kpis.length === 0 && <p className="text-xs text-gray-400">Create KPIs first.</p>}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="accent-[#7B61FF]"
              checked={cycleForm.includeAllEmployees}
              onChange={(e) =>
                setCycleForm({
                  ...cycleForm,
                  includeAllEmployees: e.target.checked,
                  departmentIds: e.target.checked ? [] : cycleForm.departmentIds,
                  roleFilters: e.target.checked ? [] : cycleForm.roleFilters,
                })
              }
            />
            Include all active employees when activated
          </label>

          {!cycleForm.includeAllEmployees && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
                <p className={labelClass}>Departments</p>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {departments.length === 0 ? (
                    <p className="text-xs text-gray-400">No departments available.</p>
                  ) : (
                    departments.map((d) => (
                      <label
                        key={d.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="accent-[#7B61FF]"
                          checked={cycleForm.departmentIds.includes(d.id)}
                          onChange={(e) =>
                            setCycleForm({
                              ...cycleForm,
                              departmentIds: e.target.checked
                                ? [...cycleForm.departmentIds, d.id]
                                : cycleForm.departmentIds.filter((id) => id !== d.id),
                            })
                          }
                        />
                        {d.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
                <p className={labelClass}>Roles</p>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {ORG_ROLES.map((role) => (
                    <label
                      key={role}
                      className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        className="accent-[#7B61FF]"
                        checked={cycleForm.roleFilters.includes(role)}
                        onChange={(e) =>
                          setCycleForm({
                            ...cycleForm,
                            roleFilters: e.target.checked
                              ? [...cycleForm.roleFilters, role]
                              : cycleForm.roleFilters.filter((r) => r !== role),
                          })
                        }
                      />
                      {roleLabel(role)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 rounded-xl bg-gray-50/80 p-3 text-[12px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {cycleForm.kpiIds.length} KPI
              {cycleForm.kpiIds.length === 1 ? "" : "s"}
            </span>
            <span>·</span>
            <span>
              {cycleForm.includeAllEmployees
                ? "Enrolls all active employees"
                : cycleForm.departmentIds.length || cycleForm.roleFilters.length
                  ? `Enrolls filtered scope (${cycleForm.departmentIds.length} dept, ${cycleForm.roleFilters.length} role)`
                  : "No employees selected yet"}
            </span>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCycleOpen(false)}>
            Cancel
          </Button>
          <Button loading={busy} onClick={createCycle}>
            Create cycle
          </Button>
        </div>
      </Dialog>
    </>
  );
}