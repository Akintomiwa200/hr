"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { todayInputValue } from "@/lib/dates";

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

function addDaysInput(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ResignationForm({
  noticePeriodDays,
  compact = false,
}: {
  noticePeriodDays: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lastWorkingDay, setLastWorkingDay] = useState(
    addDaysInput(noticePeriodDays)
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/resignation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: form.get("reason"),
        requestedLastWorkingDay: form.get("lastWorkingDay"),
      }),
    });

    if (!res.ok) {
      notify.error(await readApiError(res, "Could not submit your resignation"));
      setLoading(false);
      return;
    }

    notify.success("Resignation submitted", "Your resignation request has been sent.");
    router.refresh();
    setLoading(false);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-white overflow-hidden",
        compact ? "p-5" : "p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      )}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm shadow-amber-500/20">
          <CalendarClock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Submit your resignation</h3>
          <p className="text-xs text-gray-500">
            Your standard notice period is {noticePeriodDays} day
            {noticePeriodDays === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Last working day</label>
          <input
            name="lastWorkingDay"
            type="date"
            required
            min={todayInputValue()}
            value={lastWorkingDay}
            onChange={(e) => setLastWorkingDay(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-gray-500 mt-1.5">
            HR may adjust this date during approval.
          </p>
        </div>
        <div>
          <label className={labelClass}>Reason for leaving</label>
          <textarea
            name="reason"
            rows={3}
            required
            minLength={5}
            placeholder="Share a brief reason for your resignation..."
            className={inputClass}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[11px] text-gray-500">
            Once submitted, your line manager and HR are notified. You can withdraw while it is
            still pending.
          </p>
          <Button type="submit" loading={loading}>
            <Send className="w-4 h-4" />
            Submit resignation
          </Button>
        </div>
      </form>
    </div>
  );
}
