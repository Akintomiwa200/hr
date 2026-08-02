"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Filter,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Avatar, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { CheckInCard } from "@/components/attendance/check-in-card";
import { AttendanceMethodBadge } from "@/components/attendance/attendance-method-badge";
import { DeviceIntegrationPanel } from "@/components/attendance/device-integration-panel";
import { useAttendanceLive } from "@/hooks/use-attendance-live";
import { cn, formatDate, fullName } from "@/lib/utils";

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
  presentTodayCount,
  appUrl,
  showDevicePanel,
}: {
  records: AttendanceRow[];
  todayRecord?: TodayRecord;
  isEmployee: boolean;
  presentTodayCount?: number;
  appUrl?: string;
  showDevicePanel?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  useAttendanceLive();

  const stats = useMemo(() => {
    const present = records.filter((r) =>
      ["PRESENT", "REMOTE", "LATE", "HALF_DAY"].includes(r.status)
    ).length;
    const late = records.filter((r) => r.status === "LATE").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    return { present, late, absent, total: records.length };
  }, [records]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      fullName(r.employee.firstName, r.employee.lastName).toLowerCase().includes(q)
    );
  }, [records, search, statusFilter]);

  return (
    <div className="space-y-6">
      {isEmployee && todayRecord !== undefined && (
        <CheckInCard todayRecord={todayRecord} />
      )}

      {!isEmployee && presentTodayCount !== undefined && (
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50/70 to-white p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Today&apos;s check-ins</p>
              <p className="text-xs text-gray-500">Employees present, remote, or late today</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-brand-600">{presentTodayCount}</p>
        </div>
      )}

      {showDevicePanel && appUrl && (
        <DeviceIntegrationPanel appUrl={appUrl} />
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
            <h2 className="text-base font-semibold text-gray-900">Attendance log</h2>
            <p className="text-xs text-gray-500 mt-0.5">Last 30 days · used for payroll deductions</p>
          </div>
          {!isEmployee && (
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
              description="Records appear when employees check in for the day."
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
                    {!isEmployee && (
                      <Avatar
                        firstName={record.employee.firstName}
                        lastName={record.employee.lastName}
                        size="sm"
                      />
                    )}
                    <div>
                      {!isEmployee ? (
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
                      {!isEmployee && (
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
