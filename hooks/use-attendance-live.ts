"use client";

import { useRouter } from "next/navigation";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";

type DevicePingData = {
  deviceId?: string | null;
  deviceName?: string;
  lastSeenAt?: string;
};

export function useDeviceLive(onDevicePing?: (data: DevicePingData) => void) {
  const router = useRouter();

  useAppEvents({
    types: ["attendance_updated", "device_ping"],
    onEvent: (type) => {
      if (type === "device_ping") {
        onDevicePing?.({});
        return;
      }
      if (type === "attendance_updated") {
        onDevicePing?.({});
        scheduleRouterRefresh(() => router.refresh());
      }
    },
  });
}

/** Immediate live callback for attendance UIs. Falls back to a coalesced page refresh. */
export function useAttendanceLive(onLive?: () => void) {
  const router = useRouter();
  useAppEvents({
    types: ["attendance_updated", "leave_updated", "device_ping"],
    onEvent: (type) => {
      if (!type) return;
      if (onLive) {
        onLive();
        return;
      }
      scheduleRouterRefresh(() => router.refresh());
    },
  });
}
