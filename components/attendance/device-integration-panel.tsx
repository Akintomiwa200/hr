"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Fingerprint, Wifi } from "lucide-react";
import { useDeviceLive } from "@/hooks/use-attendance-live";
import { cn } from "@/lib/utils";
import { isDeviceOnline } from "@/lib/attendance-device-spec";

type DeviceSummary = {
  id: string;
  name: string;
  lastSeenAt: string | null;
  isActive: boolean;
  branch?: { name: string } | null;
};

function isOnline(lastSeenAt: string | null) {
  return isDeviceOnline(lastSeenAt);
}

export function DeviceIntegrationPanel({ appUrl }: { appUrl: string }) {
  const [status, setStatus] = useState<{
    message: string;
    onlineDevices: number;
    branches: number;
  } | null>(null);

  const loadStatus = async () => {
    const res = await fetch("/api/attendance/device/docs");
    if (!res.ok) return;
    const data = await res.json();
    const online = (data.devices as DeviceSummary[]).filter(
      (d) => d.isActive && isOnline(d.lastSeenAt)
    ).length;
    setStatus({
      message:
        online > 0
          ? `${online} ZKTeco terminal(s) online`
          : "Waiting for ZKTeco terminals",
      onlineDevices: online,
      branches: Array.isArray(data.branches) ? data.branches.length : 0,
    });
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useDeviceLive(() => {
    loadStatus();
  });

  const online = (status?.onlineDevices ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/50 via-white to-white p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
            <Fingerprint className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">ZKTeco hardware</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Real-time attendance from every branch location · {appUrl.replace(/^https?:\/\//, "")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-medium",
                  online ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    online ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                  )}
                />
                {status?.message ?? "Loading…"}
              </span>
              <span className="text-gray-400">
                · {status?.branches ?? 0} branch{(status?.branches ?? 0) === 1 ? "" : "es"}
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/attendance/devices"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors shrink-0"
        >
          <Wifi className="w-4 h-4" />
          ZKTeco console
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
