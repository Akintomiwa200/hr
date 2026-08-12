"use client";

import { useRouter } from "next/navigation";
import { useAppEvents } from "@/hooks/use-app-events";

type DevicePingData = {
  deviceId?: string | null;
  deviceName?: string;
  lastSeenAt?: string;
};

export function useDeviceLive(onDevicePing?: (data: DevicePingData) => void) {
  const router = useRouter();

  useAppEvents({
    types: ["attendance_updated", "device_ping", "dashboard_updated"],
    pollIntervalMs: 4000,
    onEvent: (type) => {
      if (type === "device_ping") {
        // payload details aren't threaded through; refresh covers device status
        onDevicePing?.({});
      }
      router.refresh();
    },
  });
}

export function useAttendanceLive() {
  const router = useRouter();

  useAppEvents({
    types: ["attendance_updated", "device_ping", "dashboard_updated", "leave_updated"],
    pollIntervalMs: 3000,
    onEvent: () => router.refresh(),
  });
}
