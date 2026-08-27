"use client";

import { Clock, TrendingUp, UserCheck, XCircle } from "lucide-react";
import { EmptyState, StatCard, statusBadge } from "@/components/ui";
import { EmployeeTimeNav } from "@/components/employees/employee-time-nav";
import { CheckInCard } from "@/components/attendance/check-in-card";
import { AttendanceMethodBadge } from "@/components/attendance/attendance-method-badge";
import { useAttendanceLive } from "@/hooks/use-attendance-live";
import { formatDate } from "@/lib/utils";

type Record = {
  id: string;
  date: Date | string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string;
  checkInMethod?: string | null;
  checkOutMethod?: string | null;
  deviceName?: string | null;
};

function formatTime(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function EmployeeAttendanceModule({
  employeeId,
  employeeName,
  records,
  todayRecord,
  showCheckIn,
  canManageManual = false,
  showPayrollTab = false,
  stats,
}: {
  employeeId: string;
  employeeName: string;
  records: Record[];
  todayRecord: {
    checkIn: Date | string | null;
    checkOut: Date | string | null;
    status: string;
    checkInMethod?: string | null;
    checkOutMethod?: string | null;
    deviceName?: string | null;
  } | null;
  showCheckIn: boolean;
  canManageManual?: boolean;
  showPayrollTab?: boolean;
  stats: { present: number; late: number; absent: number; total: number };
}) {
  useAttendanceLive();
  return (
    <div>
      <EmployeeTimeNav employeeId={employeeId} active="attendance" showPayrollTab={showPayrollTab} />

      {showCheckIn && (
        <div className="mb-6">
          <CheckInCard todayRecord={todayRecord} />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Present (30d)" value={stats.present} icon={UserCheck} />
        <StatCard label="Late (30d)" value={stats.late} icon={TrendingUp} />
        <StatCard label="Absent (30d)" value={stats.absent} icon={XCircle} />
        <StatCard label="Total records" value={stats.total} icon={Clock} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-50/30 to-white">
          <h2 className="text-base font-semibold text-gray-900">{employeeName}&apos;s attendance</h2>
          <p className="text-xs text-gray-500 mt-0.5">Check-in history and daily status</p>
        </div>
        <div className="p-5 space-y-2">
          {records.length === 0 ? (
            <EmptyState icon={Clock} title="No records" description="Attendance will appear after check-in." />
          ) : (
            records.map((record) => (
              <div
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-gray-100"
              >
                <p className="text-sm font-medium text-gray-900">{formatDate(record.date)}</p>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">In</p>
                    <p className="text-sm font-medium">{formatTime(record.checkIn)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">Out</p>
                    <p className="text-sm font-medium">{formatTime(record.checkOut)}</p>
                  </div>
                  {record.checkInMethod && (
                    <AttendanceMethodBadge
                      method={record.checkInMethod}
                      deviceName={record.deviceName}
                    />
                  )}
                  {statusBadge(record.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
