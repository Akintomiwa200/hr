"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { AttendanceMethodBadge } from "@/components/attendance/attendance-method-badge";
import { notify, readApiError } from "@/lib/toast";

type TodayRecord = {
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string;
  checkInMethod?: string | null;
  checkOutMethod?: string | null;
  deviceName?: string | null;
} | null;

function formatTime(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CheckInCard({
  todayRecord,
  onChanged,
}: {
  todayRecord: TodayRecord;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"in" | "out" | null>(null);

  async function checkIn() {
    setLoading("in");
    const res = await fetch("/api/attendance/check-in", { method: "POST" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to check in"));
    } else {
      notify.success("Checked in successfully");
      onChanged?.();
      router.refresh();
    }
    setLoading(null);
  }

  async function checkOut() {
    setLoading("out");
    const res = await fetch("/api/attendance/check-out", { method: "POST" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to check out"));
    } else {
      notify.success("Checked out successfully");
      onChanged?.();
      router.refresh();
    }
    setLoading(null);
  }

  const completed = todayRecord?.checkIn && todayRecord?.checkOut;
  const checkedIn = todayRecord?.checkIn && !todayRecord?.checkOut;

  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
            Today&apos;s attendance
          </p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            {completed
              ? "Day complete"
              : checkedIn
                ? "You're checked in"
                : "Ready to start?"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 min-w-[120px]">
            <p className="text-[10px] uppercase text-gray-400 font-medium flex items-center gap-1">
              <LogIn className="w-3 h-3" /> Check in
            </p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {formatTime(todayRecord?.checkIn ?? null)}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 min-w-[120px]">
            <p className="text-[10px] uppercase text-gray-400 font-medium flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Check out
            </p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {formatTime(todayRecord?.checkOut ?? null)}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {!todayRecord && (
            <Button onClick={checkIn} loading={loading === "in"} className="min-w-[140px]">
              <LogIn className="w-4 h-4" />
              Check in
            </Button>
          )}
          {checkedIn && (
            <Button
              onClick={checkOut}
              loading={loading === "out"}
              variant="secondary"
              className="min-w-[140px]"
            >
              <LogOut className="w-4 h-4" />
              Check out
            </Button>
          )}
          {completed && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              Completed for today
            </div>
          )}
        </div>
      </div>

      {todayRecord?.checkInMethod && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AttendanceMethodBadge
            method={todayRecord.checkInMethod}
            deviceName={todayRecord.deviceName}
          />
          {todayRecord.checkOutMethod && (
            <AttendanceMethodBadge method={todayRecord.checkOutMethod} />
          )}
        </div>
      )}

      {todayRecord?.status === "LATE" && (
        <p className="mt-4 text-xs text-amber-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Marked late — after 9:15 AM check-in threshold
        </p>
      )}
    </div>
  );
}

export function CheckInButton({ todayRecord }: { todayRecord: TodayRecord }) {
  return <CheckInCard todayRecord={todayRecord} />;
}
