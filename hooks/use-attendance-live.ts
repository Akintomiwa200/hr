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
        scheduleRouterRefresh(() => router.refresh());
      }
    },
  });
}

export function useAttendanceLive() {
  const router = useRouter();
  useAppEvents({
    types: ["attendance_updated", "leave_updated"],
    onEvent: (type) => {
      if (!type) return;
      scheduleRouterRefresh(() => router.refresh());
    },
  });
}
