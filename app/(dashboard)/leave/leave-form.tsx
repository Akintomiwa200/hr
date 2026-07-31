"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Textarea } from "@/components/ui";

export function LeaveRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      type: form.get("type"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      reason: form.get("reason"),
    };

    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to submit request");
      setLoading(false);
      return;
    }

    (e.target as HTMLFormElement).reset();
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Request Leave</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Leave Type" name="type" required>
          <option value="ANNUAL">Annual Leave</option>
          <option value="SICK">Sick Leave</option>
          <option value="PERSONAL">Personal Leave</option>
          <option value="MATERNITY">Maternity Leave</option>
          <option value="PATERNITY">Paternity Leave</option>
          <option value="UNPAID">Unpaid Leave</option>
        </Select>
        <div />
        <Input label="Start Date" name="startDate" type="date" required />
        <Input label="End Date" name="endDate" type="date" required />
        <div className="md:col-span-2">
          <Textarea label="Reason" name="reason" rows={3} required placeholder="Brief reason for leave..." />
        </div>
        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
        <div className="md:col-span-2">
          <Button type="submit" loading={loading}>Submit Request</Button>
        </div>
      </form>
    </div>
  );
}
