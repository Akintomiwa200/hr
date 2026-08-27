"use client";

import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import { useRouter } from "next/navigation";

/** Keeps dashboard widgets in sync via SSE only (no polling). */
export function DashboardLiveRefresh() {
  const router = useRouter();
  useAppEvents({
    types: [
      "attendance_updated",
      "leave_updated",
      "employee_updated",
      "payroll_updated",
    ],
    onEvent: (type) => {
      if (!type) return;
      scheduleRouterRefresh(() => router.refresh());
    },
  });
  return null;
}
