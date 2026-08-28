"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Filter,
  Fingerprint,
  MapPin,
  Pencil,
  Radio,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Avatar, Button, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { CheckInCard } from "@/components/attendance/check-in-card";
import { AttendanceMethodBadge } from "@/components/attendance/attendance-method-badge";
import { LiveTerminalCard } from "@/components/attendance/live-terminal-card";
import { useAttendanceLive } from "@/hooks/use-attendance-live";
import { cn, formatDate, fullName } from "@/lib/utils";
import type { WorkspaceMode } from "@/lib/role-workspace";
import type {
  AttendanceOverview,
  AttendanceOverviewRow,
  AttendancePunchRow,
} from "@/lib/attendance-overview";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PRESENT", label: "Present" },
  { id: "LATE", label: "Late" },
  { id: "ABSENT", label: "Absent" },
  { id: "REMOTE", label: "Remote" },
] as const;

const PUNCH_FILTERS = [
  { id: "ALL", label: "All operations" },
  { id: "IN", label: "In" },
  { id: "OUT", label: "Out" },
  { id: "UNMATCHED", label: "Not in Smart HR yet" },
] as const;

type PunchFilterId = (typeof PUNCH_FILTERS)[number]["id"];
type ViewTab = "live" | "history" | "punches" | "mine";

function formatTime(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(date: Date | string) {
  return new Date(date).toDateString() === new Date().toDateString();
}

function recordBranchId(record: AttendanceOverviewRow) {
  return record.employee.branchId || record.deviceBranchId || "";
}

function punchStatusLabel(punch: AttendancePunchRow) {
  if (punch.processed) return punch.duplicate ? "Already recorded" : "On attendance";
  if (punch.error === "EMPLOYEE_NOT_FOUND") return "On device · not in Smart HR yet";
  if (punch.error === "UNREGISTERED_DEVICE") return "Terminal not registered";
  return punch.error || "Waiting";
}

function punchActionLabel(action: AttendancePunchRow["action"]) {
  if (action === "check_in") return "In";
  if (action === "check_out") return "Out";
  return "Punch";
}

function PunchRows({ punches }: { punches: AttendancePunchRow[] }) {
  return (
    <div className="space-y-2">
      {punches.map((punch) => (
        <div
          key={punch.id}
          className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border",
            punch.processed
              ? "border-emerald-100 bg-emerald-50/40"
              : punch.error
                ? "border-amber-200 bg-amber-50/50"
                : "border-gray-100"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {punch.employee ? (
              <Avatar firstName={punch.employee.firstName} lastName={punch.employee.lastName} size="sm" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Fingerprint className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              {punch.employee ? (
                <Link
                  href={`/employees/${punch.employee.id}/attendance`}
                  className="text-sm font-semibold text-gray-900 hover:text-brand-600"
                >
                  {fullName(punch.employee.firstName, punch.employee.lastName)}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-gray-900">Device user · PIN {punch.pin}</p>
              )}
              <p className="text-[11px] text-gray-500 truncate">
                PIN {punch.pin}
                {punch.employee?.employeeCode ? ` · ${punch.employee.employeeCode}` : ""}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {punch.deviceName || `SN ${punch.serialNumber}`}
                {punch.branchName ? ` · ${punch.branchName}` : ""}
                {" · "}
                {formatDate(punch.punchedAt)} {formatTime(punch.punchedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase">{punchActionLabel(punch.action)}</p>
              <p className="text-sm font-medium text-gray-800">{formatTime(punch.punchedAt)}</p>
              <p className="text-[10px] text-gray-500">{formatDate(punch.punchedAt)}</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700">
              <Fingerprint className="w-3 h-3" />
              {punch.verifyLabel}
            </span>
            <span
              className={cn(
                "text-[11px] font-medium",
                punch.processed ? "text-emerald-700" : "text-amber-800"
              )}
            >
              {punchStatusLabel(punch)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttendanceModule({
  overview,
  isEmployee,
  mode = isEmployee ? "self" : "org",
  appUrl,
  showDevicePanel,
  showCheckIn,
  currentEmployeeId,
  canManageManual = false,
}: {
  overview: AttendanceOverview;
  isEmployee: boolean;
  mode?: WorkspaceMode;
  appUrl?: string;
  showDevicePanel?: boolean;
  showCheckIn?: boolean;
  currentEmployeeId?: string | null;
  canManageManual?: boolean;
}) {
  const [data, setData] = useState(overview);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [branchId, setBranchId] = useState("ALL");
  const [deviceId, setDeviceId] = useState("ALL");
  const [punchFilter, setPunchFilter] = useState<PunchFilterId>("ALL");
  const [tab, setTab] = useState<ViewTab>(mode === "self" ? "history" : "live");
  const [editRecord, setEditRecord] = useState<AttendanceOverviewRow | null>(null);
  const [editForm, setEditForm] = useState({ checkIn: "", checkOut: "", status: "PRESENT" });
  const [saving, setSaving] = useState(false);
  const [liveAt, setLiveAt] = useState<Date | null>(null);

  useEffect(() => {
    setData(overview);
  }, [overview]);

  const loadOverview = useCallback(async () => {
    const res = await fetch("/api/attendance/overview");
    if (!res.ok) return;
    const next = (await res.json()) as AttendanceOverview;
    setData(next);
    setLiveAt(new Date());
  }, []);

  useAttendanceLive(loadOverview);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadOverview();
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [loadOverview]);

  useEffect(() => {
    if (!data.showPunches) return;
    const pull = () => {
      void fetch("/api/attendance/devices/live-sync", { method: "POST" });
    };
    pull();
    const timer = window.setInterval(pull, 25_000);
    return () => window.clearInterval(timer);
  }, [data.showPunches]);

  const records = data.records;
  const punches = data.punches;
  const branches = data.branches;
  const devices = data.devices ?? [];
  const showPunches = data.showPunches;
  const todayStartMs = data.todayStart
    ? new Date(data.todayStart).getTime()
    : (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })();
  const isPunchToday = (value: Date | string) => new Date(value).getTime() >= todayStartMs;

  const myRecords = useMemo(
    () => (currentEmployeeId ? records.filter((r) => r.employee.id === currentEmployeeId) : []),
    [records, currentEmployeeId]
  );

  const rosterRecords = useMemo(
    () =>
      currentEmployeeId && mode !== "self"
        ? records.filter((r) => r.employee.id !== currentEmployeeId)
        : records,
    [records, currentEmployeeId, mode]
  );

  const scopedRecords = mode === "self" || tab === "mine" ? (mode === "self" ? records : myRecords) : rosterRecords;

  const devicesByBranch = useMemo(() => {
    if (branchId === "ALL") return devices;
    return devices.filter((d) => d.branchId === branchId);
  }, [devices, branchId]);

  useEffect(() => {
    if (deviceId === "ALL") return;
    if (!devicesByBranch.some((d) => d.id === deviceId)) setDeviceId("ALL");
  }, [deviceId, devicesByBranch]);

  const selectedDevice = useMemo(
    () => (deviceId === "ALL" ? null : devices.find((d) => d.id === deviceId) ?? null),
    [devices, deviceId]
  );

  const byBranch = useMemo(() => {
    let list = scopedRecords;
    if (branchId !== "ALL") {
      list = list.filter((r) => recordBranchId(r) === branchId);
    }
    if (deviceId !== "ALL") {
      list = list.filter((r) => r.deviceId === deviceId);
    }
    return list;
  }, [scopedRecords, branchId, deviceId]);

  const liveRecords = useMemo(() => byBranch.filter((r) => isToday(r.date)), [byBranch]);
  const historyRecords = byBranch;

  const punchesByFilters = useMemo(() => {
    let list = punches;
    if (branchId !== "ALL") {
      list = list.filter((p) => p.branchId === branchId || p.employee?.branchId === branchId);
    }
    if (deviceId !== "ALL") {
      const serial = selectedDevice?.serialNumber?.trim().toUpperCase() ?? "";
      list = list.filter(
        (p) =>
          p.deviceId === deviceId ||
          (serial && p.serialNumber.trim().toUpperCase() === serial)
      );
    }
    if (punchFilter === "IN") list = list.filter((p) => p.action === "check_in");
    if (punchFilter === "OUT") list = list.filter((p) => p.action === "check_out");
    if (punchFilter === "UNMATCHED") {
      list = list.filter((p) => !p.processed && p.error === "EMPLOYEE_NOT_FOUND");
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = p.employee ? fullName(p.employee.firstName, p.employee.lastName).toLowerCase() : "";
        return (
          p.pin.toLowerCase().includes(q) ||
          name.includes(q) ||
          (p.employee?.employeeCode ?? "").toLowerCase().includes(q) ||
          p.serialNumber.toLowerCase().includes(q) ||
          (p.deviceName ?? "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [punches, branchId, deviceId, selectedDevice, punchFilter, search]);

  const todayPunches = useMemo(
    () => punchesByFilters.filter((p) => isPunchToday(p.punchedAt)),
    [punchesByFilters, todayStartMs]
  );

  const historyPunches = punchesByFilters;

  const filteredRecords = useMemo(() => {
    const source = tab === "live" ? liveRecords : historyRecords;
    let list = source;
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const name = fullName(r.employee.firstName, r.employee.lastName).toLowerCase();
      const code = (r.employee.employeeCode ?? "").toLowerCase();
      const pin = (r.employee.biometricPin ?? "").toLowerCase();
      return name.includes(q) || code.includes(q) || pin.includes(q);
    });
  }, [tab, liveRecords, historyRecords, statusFilter, search]);

  const filteredPunches = punchesByFilters;

  const statsSource = tab === "punches" ? liveRecords : filteredRecords;
  const stats = useMemo(() => {
    const present = statsSource.filter((r) =>
      ["PRESENT", "REMOTE", "LATE", "HALF_DAY"].includes(r.status)
    ).length;
    const late = statsSource.filter((r) => r.status === "LATE").length;
    const absent = statsSource.filter((r) => r.status === "ABSENT").length;
    return { present, late, absent, total: statsSource.length };
  }, [statsSource]);

  const presentToday = useMemo(() => {
    const today = rosterRecords.filter(
      (r) => isToday(r.date) && ["PRESENT", "REMOTE", "LATE", "HALF_DAY"].includes(r.status)
    );
    if (branchId === "ALL") return today.length;
    return today.filter((r) => recordBranchId(r) === branchId).length;
  }, [rosterRecords, branchId]);

  const unmatchedCount = useMemo(
    () =>
      punchesByFilters.filter((p) => !p.processed && p.error === "EMPLOYEE_NOT_FOUND").length,
    [punchesByFilters]
  );

  const uniquePeopleToday = useMemo(() => {
    const keys = new Set(
      todayPunches.map((p) => p.employee?.id || `pin:${p.pin}`)
    );
    return keys.size;
  }, [todayPunches]);

  const unmatchedToday = useMemo(
    () =>
      todayPunches.filter((p) => !p.processed && p.error === "EMPLOYEE_NOT_FOUND").length,
    [todayPunches]
  );

  const showPeople = mode !== "self" && tab !== "mine";
  const canCheckIn = showCheckIn ?? isEmployee;
  const showBranchFilter = mode !== "self" && branches.length > 0;

  const tabs: { id: ViewTab; label: string }[] = [];
  if (mode !== "self") tabs.push({ id: "live", label: "Live today" });
  tabs.push({ id: "history", label: mode === "self" ? "Your history" : "History" });
  if (showPunches) tabs.push({ id: "punches", label: "Thumbprints" });
  if (mode !== "self" && currentEmployeeId) tabs.push({ id: "mine", label: "My history" });

  const saveManualEdit = async () => {
    if (!editRecord) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/attendance/${editRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: editForm.checkIn ? new Date(editForm.checkIn).toISOString() : null,
          checkOut: editForm.checkOut ? new Date(editForm.checkOut).toISOString() : null,
          status: editForm.status,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update attendance"));
        return;
      }
      notify.success("Attendance updated");
      setEditRecord(null);
      await loadOverview();
    } catch {
      notify.error("Failed to update attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {canCheckIn && (
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50/50 to-white p-1">
          <div className="rounded-xl bg-white p-4 sm:p-5">
            {mode !== "self" && (
              <p className="text-xs text-gray-500 mb-3">
                Your own check-in — separate from the {mode === "team" ? "team" : "org"} roster below.
              </p>
            )}
            <CheckInCard todayRecord={data.todayRecord} onChanged={loadOverview} />
          </div>
        </div>
      )}

      {mode !== "self" && (
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50/70 to-white p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {showPunches
                  ? branchId === "ALL" && deviceId === "ALL"
                    ? "People who used the machines today"
                    : "People who used this filter today"
                  : branchId === "ALL"
                    ? mode === "team"
                      ? "Team present today"
                      : "Present across org today"
                    : "Present at this branch today"}
              </p>
              <p className="text-xs text-gray-500">
                {showPunches
                  ? `${todayPunches.length} live thumbprint${todayPunches.length === 1 ? "" : "s"} from the hardware`
                  : "Live from ZKTeco thumbprints and web check-in"}
                {liveAt ? ` · updated ${formatTime(liveAt)}` : ""}
              </p>
            </div>
          </div>
          <p className="text-3xl font-bold text-brand-600">
            {showPunches ? uniquePeopleToday : presentToday}
          </p>
        </div>
      )}

      {showDevicePanel && tab === "live" && (devicesByBranch.length > 0 || appUrl) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Live terminals</h3>
              <p className="text-xs text-gray-500">
                Status and thumbprints from the machines — same cards as ZKTeco console.
              </p>
            </div>
            <Link
              href="/attendance/devices"
              className="text-xs font-medium text-brand-600 hover:underline shrink-0"
            >
              Manage terminals
            </Link>
          </div>
          {devicesByBranch.length === 0 ? (
            <p className="text-sm text-gray-500">No terminals registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {devicesByBranch.map((device) => (
                <LiveTerminalCard
                  key={device.id}
                  device={{
                    id: device.id,
                    name: device.name,
                    serialNumber: device.serialNumber,
                    ipAddress: device.ipAddress,
                    commPort: device.commPort,
                    lastSeenAt: device.lastSeenAt,
                    isActive: device.isActive,
                    branchName: device.branchName,
                    lastPunchAt: device.lastPunchAt,
                    lastPunchPin: device.lastPunchPin,
                    lastPunchName: device.lastPunchName,
                    todayPunchCount: device.todayPunchCount,
                    todayUserCount: device.todayUserCount,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tabs.length > 1 && (
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-xl border transition-colors inline-flex items-center gap-1.5",
              tab === item.id
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
            )}
          >
            {item.id === "live" && <Radio className="w-3.5 h-3.5" />}
            {item.id === "punches" && <Fingerprint className="w-3.5 h-3.5" />}
            {item.label}
            {item.id === "punches" && unmatchedToday > 0 && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  tab === item.id ? "bg-white/20" : "bg-amber-100 text-amber-800"
                )}
              >
                {unmatchedToday}
              </span>
            )}
          </button>
        ))}
      </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={tab === "punches" || (tab === "history" && showPunches) ? "Thumbprints shown" : "Records shown"}
          value={
            tab === "punches"
              ? filteredPunches.length
              : tab === "history" && showPunches
                ? historyPunches.length
                : stats.total
          }
          icon={Clock}
        />
        <StatCard label="Present / remote" value={stats.present} icon={UserCheck} />
        <StatCard label="Late" value={stats.late} icon={TrendingUp} />
        <StatCard
          label={tab === "punches" || tab === "history" ? "Unmatched PINs" : "Absent"}
          value={
            tab === "punches" || tab === "history" ? unmatchedCount : stats.absent
          }
          icon={Clock}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-brand-50/30 via-white to-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900 inline-flex items-center gap-2">
              {tab === "live" && "Live today"}
              {tab === "history" && (mode === "self" ? "Your attendance log" : "Device history")}
              {tab === "punches" && "Hardware usage"}
              {tab === "mine" && "Your check-ins"}
              {(tab === "live" || (tab === "history" && showPunches)) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Real-time
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {tab === "live" && "Updates as soon as someone punches on a terminal."}
              {tab === "history" &&
                (showPunches
                  ? "Live log from the machines · last 90 days · includes people not yet in Smart HR"
                  : "Last 90 days · used for payroll deductions")}
              {tab === "punches" &&
                "Every fingerprint stored on the hardware, including PINs not yet in Smart HR."}
              {tab === "mine" && "Last 90 days · used for payroll deductions"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {showBranchFilter && (
              <label className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 min-w-[180px]"
                >
                  <option value="ALL">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {showPunches && devices.length > 0 && (
              <label className="relative">
                <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 min-w-[180px]"
                >
                  <option value="ALL">All devices</option>
                  {devicesByBranch.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                      {device.branchName ? ` · ${device.branchName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(showPeople || tab === "punches" || (tab === "history" && showPunches)) && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    tab === "punches" || tab === "history"
                      ? "Search name, PIN, or device..."
                      : "Search employee..."
                  }
                  className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 w-full sm:w-56"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {showPunches && (tab === "punches" || tab === "history" || tab === "live") && (
          <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap items-center gap-2">
            <Fingerprint className="w-4 h-4 text-gray-400" />
            {PUNCH_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPunchFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors",
                  punchFilter === f.id
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {tab !== "punches" && (
          <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors",
                  statusFilter === f.id
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-5">
          {tab === "punches" ? (
            filteredPunches.length === 0 ? (
              <EmptyState
                icon={Fingerprint}
                title="No thumbprint operations"
                description="Try All devices / All branches, or wait for someone to punch on a connected terminal."
              />
            ) : (
              <PunchRows punches={filteredPunches} />
            )
          ) : filteredRecords.length === 0 &&
            !(tab === "live" && showPunches) &&
            !(tab === "history" && showPunches && historyPunches.length > 0) ? (
            <EmptyState
              icon={Clock}
              title={tab === "live" ? "No one has punched yet today" : "No attendance records"}
              description={
                tab === "live"
                  ? "Ask someone to thumbprint on the terminal. Every PIN from the machine appears here in real time, including people not yet in Smart HR."
                  : mode === "self" || tab === "mine"
                    ? "Your check-ins will appear here after you clock in."
                    : "Records appear when people in your scope check in for the day."
              }
            />
          ) : (
            <div className="space-y-5">
              {tab === "live" && showPunches && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Live hardware usage today
                    {deviceId !== "ALL" && selectedDevice ? ` · ${selectedDevice.name}` : " · all devices"}
                    {` · ${uniquePeopleToday} ${uniquePeopleToday === 1 ? "person" : "people"}`}
                  </p>
                  {todayPunches.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">
                      Waiting for the next thumbprint. Everyone who uses a connected terminal appears here in real time, even if they are not in Smart HR yet.
                    </p>
                  ) : (
                    <PunchRows punches={todayPunches} />
                  )}
                </div>
              )}
              {tab === "history" && showPunches && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Hardware history
                    {deviceId !== "ALL" && selectedDevice
                      ? ` · ${selectedDevice.name}`
                      : " · all devices"}
                    {branchId !== "ALL" ? " · this branch" : ""}
                    {` · ${historyPunches.length}`}
                  </p>
                  {historyPunches.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">
                      Downloading logs from each Device IP. History appears here even if the terminal is not yet linked to Smart HR.
                    </p>
                  ) : (
                    <PunchRows punches={historyPunches} />
                  )}
                </div>
              )}
              {filteredRecords.length > 0 && (
            <div className="space-y-2">
              {(tab === "live" && showPunches) ||
              (tab === "history" && showPunches) ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Daily roster
                </p>
              ) : null}
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-colors",
                    isToday(record.date)
                      ? "border-brand-200 bg-brand-50/30"
                      : "border-gray-100 hover:border-brand-100 hover:bg-gray-50/50"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {showPeople && (
                      <Avatar
                        firstName={record.employee.firstName}
                        lastName={record.employee.lastName}
                        size="sm"
                      />
                    )}
                    <div>
                      {showPeople ? (
                        <Link
                          href={`/employees/${record.employee.id}/attendance`}
                          className="text-sm font-semibold text-gray-900 hover:text-brand-600"
                        >
                          {fullName(record.employee.firstName, record.employee.lastName)}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(record.date)}
                          {isToday(record.date) && (
                            <span className="ml-2 text-[10px] font-bold uppercase text-brand-600">
                              Today
                            </span>
                          )}
                        </p>
                      )}
                      {showPeople && (
                        <p className="text-xs text-gray-500">
                          {formatDate(record.date)}
                          {record.employee.branch?.name ? ` · ${record.employee.branch.name}` : ""}
                          {record.deviceName ? ` · ${record.deviceName}` : ""}
                          {record.employee.biometricPin ? ` · PIN ${record.employee.biometricPin}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase">In</p>
                      <p className="text-sm font-medium text-gray-800">{formatTime(record.checkIn)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase">Out</p>
                      <p className="text-sm font-medium text-gray-800">{formatTime(record.checkOut)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {record.checkInMethod && (
                        <AttendanceMethodBadge
                          method={record.checkInMethod}
                          deviceName={record.deviceName}
                        />
                      )}
                      {statusBadge(record.status)}
                      {canManageManual && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditRecord(record);
                            setEditForm({
                              checkIn: record.checkIn
                                ? new Date(record.checkIn).toISOString().slice(0, 16)
                                : "",
                              checkOut: record.checkOut
                                ? new Date(record.checkOut).toISOString().slice(0, 16)
                                : "",
                              status: record.status,
                            });
                          }}
                          className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg"
                          title="Correct attendance"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Correct attendance"
        size="md"
      >
        {editRecord && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {fullName(editRecord.employee.firstName, editRecord.employee.lastName)} ·{" "}
              {formatDate(editRecord.date)}
            </p>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Check in</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                value={editForm.checkIn}
                onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Check out</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                value={editForm.checkOut}
                onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                {["PRESENT", "LATE", "REMOTE", "ABSENT", "HALF_DAY"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditRecord(null)}>
                Cancel
              </Button>
              <Button loading={saving} onClick={saveManualEdit}>
                Save correction
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
