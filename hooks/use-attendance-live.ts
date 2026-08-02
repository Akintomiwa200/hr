"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DevicePingData = {
  deviceId?: string | null;
  deviceName?: string;
  lastSeenAt?: string;
};

export function useDeviceLive(onDevicePing?: (data: DevicePingData) => void) {
  const router = useRouter();

  const handleEvent = useCallback(
    (payload: { type?: string; data?: DevicePingData }) => {
      if (payload.type === "attendance_updated") {
        router.refresh();
      }
      if (payload.type === "device_ping" && payload.data) {
        onDevicePing?.(payload.data);
        router.refresh();
      }
    },
    [router, onDevicePing]
  );

  useEffect(() => {
    let source: EventSource | null = null;

    try {
      source = new EventSource("/api/events");
      source.onmessage = (event) => {
        try {
          handleEvent(JSON.parse(event.data) as { type?: string; data?: DevicePingData });
        } catch {
          // ignore malformed events
        }
      };
    } catch {
      // SSE unavailable
    }

    return () => source?.close();
  }, [handleEvent]);
}

export function useAttendanceLive() {
  const router = useRouter();

  useEffect(() => {
    let source: EventSource | null = null;

    try {
      source = new EventSource("/api/events");
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (
            payload.type === "attendance_updated" ||
            payload.type === "device_ping"
          ) {
            router.refresh();
          }
        } catch {
          // ignore malformed events
        }
      };
    } catch {
      // SSE unavailable
    }

    return () => source?.close();
  }, [router]);
}
