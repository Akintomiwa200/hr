"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Radio, Check, Wifi } from "lucide-react";
import { notify } from "@/lib/toast";
import { useDeviceLive } from "@/hooks/use-attendance-live";
import { cn } from "@/lib/utils";

type DeviceSummary = {
  id: string;
  name: string;
  location: string | null;
  lastSeenAt: string | null;
  isActive: boolean;
  online?: boolean;
};

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

export function DeviceIntegrationPanel({ appUrl }: { appUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    onlineDevices: number;
    punchUrl: string;
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
        online > 0 ? `${online} device(s) online` : "Waiting for device ping",
      onlineDevices: online,
      punchUrl: data.spec?.endpoints?.punch?.url ?? `${appUrl}/api/attendance/device`,
    });
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useDeviceLive(() => {
    loadStatus();
  });

  const punchUrl = status?.punchUrl ?? `${appUrl}/api/attendance/device`;

  const copy = async () => {
    await navigator.clipboard.writeText(punchUrl);
    setCopied(true);
    notify.success("Punch endpoint copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const online = (status?.onlineDevices ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/50 via-white to-white p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Check-in device integration</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Kiosk & biometric apps connect via REST · attendance updates live via SSE
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
              <span className="text-gray-400">· Live updates via SSE</span>
            </div>
          </div>
        </div>
        <Link
          href="/attendance/devices"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors shrink-0"
        >
          <Wifi className="w-4 h-4" />
          Device console
          <ArrowRight className="w-4 h-4" />
        </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-brand-600 bg-white border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors shrink-0"
          >
          API reference
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Punch endpoint</p>
          <code className="text-xs text-gray-800 break-all">{punchUrl}</code>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 shrink-0"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          Copy URL
        </button>
      </div>
    </div>
  );
}
