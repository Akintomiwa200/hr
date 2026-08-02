"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

const LEAVE_TYPES = [
  { value: "ANNUAL", label: "Annual leave" },
  { value: "SICK", label: "Sick leave" },
  { value: "PERSONAL", label: "Personal leave" },
  { value: "MATERNITY", label: "Maternity leave" },
  { value: "PATERNITY", label: "Paternity leave" },
  { value: "UNPAID", label: "Unpaid leave" },
];

export function LeaveRequestForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.get("type"),
        startDate: form.get("startDate"),
        endDate: form.get("endDate"),
        reason: form.get("reason"),
      }),
    });

    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to submit request"));
      setLoading(false);
      return;
    }

    (e.target as HTMLFormElement).reset();
    notify.success("Leave request submitted successfully");
    router.refresh();
    setLoading(false);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/60 via-white to-white overflow-hidden",
        compact ? "p-5" : "p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      )}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm shadow-brand-500/20">
          <CalendarPlus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Request leave</h3>
          <p className="text-xs text-gray-500">Submit for manager approval</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelClass}>Leave type</label>
          <select name="type" required className={inputClass}>
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Start date</label>
          <input name="startDate" type="date" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End date</label>
          <input name="endDate" type="date" required className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Reason</label>
          <textarea
            name="reason"
            rows={3}
            required
            placeholder="Brief reason for your request..."
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" loading={loading}>
            <Send className="w-4 h-4" />
            Submit request
          </Button>
        </div>
      </form>
    </div>
  );
}

export { LEAVE_TYPES };
