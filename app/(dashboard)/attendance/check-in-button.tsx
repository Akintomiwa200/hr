"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { Attendance } from "@prisma/client";

export function CheckInButton({
  todayRecord,
}: {
  todayRecord: Attendance | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckIn() {
    setLoading(true);
    await fetch("/api/attendance/check-in", { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  async function handleCheckOut() {
    setLoading(true);
    await fetch("/api/attendance/check-out", { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  if (!todayRecord) {
    return (
      <Button onClick={handleCheckIn} loading={loading}>
        Check In
      </Button>
    );
  }

  if (!todayRecord.checkOut) {
    return (
      <Button onClick={handleCheckOut} loading={loading} variant="secondary">
        Check Out
      </Button>
    );
  }

  return (
    <span className="text-sm text-emerald-600 font-medium">
      ✓ Completed for today
    </span>
  );
}
