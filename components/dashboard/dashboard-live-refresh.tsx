"use client";

import { useAppEvents } from "@/hooks/use-app-events";
import { useRouter } from "next/navigation";

/** Keeps dashboard widgets (attendance, leave, etc.) in sync without fake cached bars. */
export function DashboardLiveRefresh() {
  const router = useRouter();
  useAppEvents({
    types: [
      "attendance_updated",
      "device_ping",
      "leave_updated",
      "employee_updated",
      "dashboard_updated",
      "payroll_updated",
    ],
    pollIntervalMs: 5000,
    onEvent: () => router.refresh(),
  });
  return null;
}
