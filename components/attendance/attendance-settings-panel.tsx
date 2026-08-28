"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import type { AttendanceSettingsData } from "@/lib/attendance-settings";

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTime(value: string) {
  const [h, m] = value.split(":").map((part) => Number.parseInt(part, 10));
  return {
    hour: Number.isFinite(h) ? h : 9,
    minute: Number.isFinite(m) ? m : 0,
  };
}

export function AttendanceSettingsPanel({
  settings,
}: {
  settings: AttendanceSettingsData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(settings);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save attendance settings"));
        return;
      }
      notify.success("Attendance settings saved");
      setOpen(false);
      router.refresh();
    } catch {
      notify.error("Failed to save attendance settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Settings2 className="w-4 h-4" />
        Attendance settings
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Attendance settings" size="lg">
        <div className="space-y-4">
          <Card className="p-4 bg-violet-50/40 border-violet-100">
            <p className="text-sm font-semibold text-gray-900">Work start & lateness</p>
            <p className="text-xs text-gray-500 mt-1">
              The machine does not mark lateness — Smart HR applies these rules on check-in.
              Shift workers use their own start time from the employee profile.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Official start time
                </label>
                <input
                  type="time"
                  className={`${inputClass} mt-1`}
                  value={formatTime(form.workStartHour, form.workStartMinute)}
                  onChange={(e) => {
                    const { hour, minute } = parseTime(e.target.value);
                    setForm({ ...form, workStartHour: hour, workStartMinute: minute });
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Grace period (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  className={`${inputClass} mt-1`}
                  value={form.graceMinutes}
                  onChange={(e) =>
                    setForm({ ...form, graceMinutes: Number(e.target.value) || 0 })
                  }
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Arrivals after start + grace are marked Late. Before start = Early. Within grace =
                  On time.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-violet-50/40 border-violet-100">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-gray-900">Track break time</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, break-out / break-in punches on the terminal are stored as breaks
                  instead of check-out / check-in.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.breakTrackingEnabled}
                onChange={(e) =>
                  setForm({ ...form, breakTrackingEnabled: e.target.checked })
                }
                className="w-5 h-5 accent-violet-600"
              />
            </label>
            {form.breakTrackingEnabled && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Max break (minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={240}
                  className={`${inputClass} mt-1`}
                  value={form.maxBreakMinutes}
                  onChange={(e) =>
                    setForm({ ...form, maxBreakMinutes: Number(e.target.value) || 60 })
                  }
                />
              </div>
            )}
          </Card>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={loading}>
              Save settings
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
