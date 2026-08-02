"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

const TYPES = ["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "FINAL"];

export function ScheduleInterviewDialog({
  applicationId,
  interviewers,
  triggerLabel = "Schedule interview",
}: {
  applicationId: string;
  interviewers: { id: string; firstName: string; lastName: string }[];
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    interviewerId: interviewers[0]?.id ?? "",
    scheduledAt: "",
    durationMinutes: "60",
    type: "VIDEO",
    location: "",
    notes: "",
  });

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="w-4 h-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Schedule interview" size="lg">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-gray-500">
            Creates a Google Calendar event with Google Meet when connected. Candidate receives an
            email invite.
          </p>
          <select
            className={inputClass}
            value={form.interviewerId}
            onChange={(e) => setForm({ ...form, interviewerId: e.target.value })}
          >
            {interviewers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.firstName} {i.lastName}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
            <input
              type="number"
              min="15"
              step="15"
              className={inputClass}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              placeholder="Duration (min)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Location (optional)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Interview notes / agenda"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button loading={loading} onClick={submit}>
            Schedule
          </Button>
        </div>
      </Dialog>
    </>
  );
}
