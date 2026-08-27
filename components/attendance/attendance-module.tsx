"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Filter,
  Pencil,
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
import { DeviceIntegrationPanel } from "@/components/attendance/device-integration-panel";
import { useAttendanceLive } from "@/hooks/use-attendance-live";
import { cn, formatDate, fullName } from "@/lib/utils";
import type { WorkspaceMode } from "@/lib/role-workspace";

type AttendanceRow = {
  id: string;
  date: Date | string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string;
  checkInMethod?: string | null;
  checkOutMethod?: string | null;
  deviceName?: string | null;
  employee: { id: string; firstName: string; lastName: string };
};

type TodayRecord = {
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string;
  checkInMethod?: string | null;
  checkOutMethod?: string | null;
  deviceName?: string | null;
} | null;

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PRESENT", label: "Present" },
  { id: "LATE", label: "Late" },
  { id: "ABSENT", label: "Absent" },
  { id: "REMOTE", label: "Remote" },
] as const;

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

export function AttendanceModule({
  records,
  todayRecord,
  isEmployee,
  mode = isEmployee ? "self" : "org",
  presentTodayCount,
  appUrl,
  showDevicePanel,
  showCheckIn,
  currentEmployeeId,
  canManageManual = false,
}: {
  records: AttendanceRow[];
  todayRecord?: TodayRecord;
  isEmployee: boolean;
  mode?: WorkspaceMode;
  presentTodayCount?: number;
  appUrl?: string;
  showDevicePanel?: boolean;
  showCheckIn?: boolean;
  currentEmployeeId?: string | null;
  canManageManual?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tab, setTab] = useState<"roster" | "mine">(mode === "self" ? "mine" : "roster");
  const [editRecord, setEditRecord] = useState<AttendanceRow | null>(null);
  const [editForm, setEditForm] = useState({ checkIn: "", checkOut: "", status: "PRESENT" });
  const [saving, setSaving] = useState(false);
  useAttendanceLive();

  const myRecords = useMemo(
    () =>
      currentEmployeeId
        ? records.filter((r) => r.employee.id === currentEmployeeId)
        : [],
    [records, currentEmployeeId]
  );

  const rosterRecords = useMemo(
    () =>
      currentEmployeeId && mode !== "self"
        ? records.filter((r) => r.employee.id !== currentEmployeeId)
        : records,
    [records, currentEmployeeId, mode]
  );

  const activeRecords =
    mode === "self" ? records : tab === "mine" ? myRecords : rosterRecords;

  const stats = useMemo(() => {
    const present = activeRecords.filter((r) =>
      ["PRESENT", "REMOTE", "LATE", "HALF_DAY"].includes(r.status)
    ).length;
    const late = activeRecords.filter((r) => r.status === "LATE").length;
    const absent = activeRecords.filter((r) => r.status === "ABSENT").length;
    return { present, late, absent, total: activeRecords.length };
  }, [activeRecords]);

  const filtered = useMemo(() => {
    let list = activeRecords;
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      fullName(r.employee.firstName, r.employee.lastName).toLowerCase().includes(q)
    );
  }, [activeRecords, search, statusFilter]);

  const showPeople = mode !== "self" && tab !== "mine";
  const canCheckIn = showCheckIn ?? isEmployee;

  const logTitle =
    mode === "self"
      ? "Your attendance log"
      : tab === "mine"
        ? "Your check-ins"
        : mode === "team"
          ? "Team attendance log"
          : "Organization attendance log";

  const logHint =
    mode === "self" || tab === "mine"
      ? "Last 30 days · used for payroll deductions"
      : mode === "team"
        ? "Last 30 days for people who report to you"
        : "Last 30 days across the company · used for payroll deductions";

  const presenceLabel =
    mode === "team" ? "Team present today" : "Present across org today";

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
    } catch {
      notify.error("Failed to update attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {canCheckIn && todayRecord !== undefined && (
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50/50 to-white p-1">
          <div className="rounded-xl bg-white p-4 sm:p-5">
            {mode !== "self" && (
              <p className="text-xs text-gray-500 mb-3">
                Your own check-in — separate from the {mode === "team" ? "team" : "org"} roster below.
              </p>
            )}
            <CheckInCard todayRecord={todayRecord} />
          </div>
        </div>
      )}

      {mode !== "self" && presentTodayCount !== undefined && (
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50/70 to-white p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{presenceLabel}</p>
              <p className="text-xs text-gray-500">
                {mode === "team"
                  ? "Direct reports who are present, remote, or late"
                  : "Employees present, remote, or late today"}
              </p>
            </div>
          </div>
          <p className="text-3xl font-bold text-brand-600">{presentTodayCount}</p>
        </div>
      )}

      {showDevicePanel && appUrl && (
        <DeviceIntegrationPanel appUrl={appUrl} />
      )}

      {mode !== "self" && currentEmployeeId && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("roster")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-xl border transition-colors",
              tab === "roster"
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
            )}
          >
            {mode === "team" ? "Team roster" : "Org roster"}
          </button>
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-xl border transition-colors",
              tab === "mine"
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-brand-200"
            )}
          >
            My history
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Records shown" value={stats.total} icon={Clock} />
        <StatCard label="Present / remote" value={stats.present} icon={UserCheck} />
        <StatCard label="Late" value={stats.late} icon={TrendingUp} />
        <StatCard label="Absent" value={stats.absent} icon={Clock} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-brand-50/30 via-white to-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{logTitle}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{logHint}</p>
          </div>
          {showPeople && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee..."
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 w-full sm:w-56"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

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

        <div className="p-5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No attendance records"
              description={
                mode === "self" || tab === "mine"
                  ? "Your check-ins will appear here after you clock in."
                  : "Records appear when people in your scope check in for the day."
              }
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((record) => (
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
                        <p className="text-xs text-gray-500">{formatDate(record.date)}</p>
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
