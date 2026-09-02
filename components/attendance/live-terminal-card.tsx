"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Fingerprint,
  Globe,
  Hash,
  MapPin,
  Radio,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { DEFAULT_ZK_PORT, formatDeviceEndpoint } from "@/lib/zkteco/device-ip";
import { isDeviceLive, isDeviceOnline } from "@/lib/attendance-device-spec";
import { useLiveClock } from "@/hooks/use-live-clock";

export type LiveTerminalCardData = {
  id: string;
  name: string;
  serialNumber: string | null;
  ipAddress?: string | null;
  commPort?: number | null;
  lastSeenAt: string | null;
  isActive: boolean;
  branchName?: string | null;
  lastPunchAt?: string | null;
  lastPunchPin?: string | null;
  lastPunchName?: string | null;
  todayPunchCount?: number;
  todayUserCount?: number;
};

export function terminalOnline(lastSeenAt: string | null, isActive = true) {
  return isActive && isDeviceOnline(lastSeenAt);
}

function statusLabel(device: LiveTerminalCardData) {
  if (!device.isActive) {
    return {
      text: "Disabled",
      badgeBg: "bg-gray-100 text-gray-600 border-gray-200",
      dotBg: "bg-gray-400",
      live: false,
    };
  }

  if (isDeviceLive(device.lastSeenAt)) {
    return {
      text: "Live",
      badgeBg: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
      dotBg: "bg-emerald-500 animate-pulse",
      live: true,
    };
  }

  if (isDeviceOnline(device.lastSeenAt)) {
    return {
      text: "Connected",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotBg: "bg-emerald-500",
      live: false,
    };
  }

  if (device.lastSeenAt) {
    return {
      text: "Offline",
      badgeBg: "bg-red-50 text-red-700 border-red-200",
      dotBg: "bg-red-500",
      live: false,
    };
  }

  if (!device.ipAddress) {
    return {
      text: "Enter IP to Connect",
      badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
      dotBg: "bg-amber-500",
      live: false,
    };
  }

  return {
    text: "Click Connect to Test IP",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    dotBg: "bg-amber-500 animate-pulse",
    live: false,
  };
}

export function LiveTerminalCard({
  device,
  actions,
  compact = false,
  onClick,
}: {
  device: LiveTerminalCardData;
  actions?: React.ReactNode;
  compact?: boolean;
  admsUrl?: string;
  onClick?: () => void;
}) {
  useLiveClock(30_000);

  const connected = terminalOnline(device.lastSeenAt, device.isActive);
  const live = device.isActive && isDeviceLive(device.lastSeenAt);
  const status = statusLabel(device);

  const endpoint = device.ipAddress
    ? formatDeviceEndpoint(device.ipAddress, device.commPort ?? DEFAULT_ZK_PORT)
    : null;

  const heartbeatValue = device.lastSeenAt
    ? formatRelativeTime(device.lastSeenAt)
    : "Not connected yet";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 shadow-sm hover:shadow-md",
        connected
          ? "border-emerald-200/80 hover:border-emerald-300"
          : "border-gray-200 hover:border-gray-300"
      )}
    >
      {/* Top Accent Bar */}
      <div
        className={cn(
          "h-1.5 w-full transition-colors",
          live
            ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse"
            : connected
              ? "bg-emerald-400"
              : "bg-gradient-to-r from-amber-400 to-amber-500"
        )}
      />

      {/* Main Content Area (Clickable to open side modal) */}
      <div
        onClick={onClick}
        className={cn(
          "p-5 pb-4 transition-colors cursor-pointer",
          onClick && "hover:bg-slate-50/50"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Device Icon */}
            <div
              className={cn(
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors shadow-2xs",
                connected
                  ? "bg-gradient-to-br from-emerald-50 to-teal-50/50 border-emerald-200 text-emerald-600"
                  : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 text-gray-400"
              )}
            >
              {connected ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}

              {live && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 truncate tracking-tight">
                  {device.name}
                </h3>

                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wider",
                    status.badgeBg
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", status.dotBg)} />
                  {status.text}
                </span>

                {live && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-2xs">
                    <Radio className="w-2.5 h-2.5" />
                    Live
                  </span>
                )}
              </div>

              {device.branchName && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="font-semibold text-gray-700 truncate">{device.branchName}</span>
                </div>
              )}
            </div>
          </div>

          {onClick && (
            <div className="shrink-0 flex items-center gap-1 text-xs text-brand-600 font-semibold opacity-80 group-hover:opacity-100 transition-opacity bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">
              <Settings className="w-3.5 h-3.5" />
              <span>Details & Setup</span>
            </div>
          )}
        </div>

        {/* Quick Info Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-xs">
          <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
              Serial
            </span>
            <span className="font-mono font-bold text-gray-800 truncate block mt-0.5">
              {device.serialNumber || "—"}
            </span>
          </div>

          <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
              Device IP
            </span>
            <span className="font-mono font-bold text-gray-800 truncate block mt-0.5">
              {endpoint || "Not set"}
            </span>
          </div>

          <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
              Heartbeat
            </span>
            <span
              className={cn(
                "font-semibold truncate block mt-0.5",
                live ? "text-emerald-700 font-bold" : "text-gray-700"
              )}
            >
              {heartbeatValue}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar Footer */}
      {actions && (
        <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
          {actions}
        </div>
      )}

      {compact && (
        <Link
          href="/attendance/devices"
          className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50/50"
        >
          <span>Open ZKTeco terminal</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      )}
    </div>
  );
}

export function LiveTerminalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function ConnectButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors border border-brand-200/80 disabled:opacity-50"
    >
      Connect / Edit
    </button>
  );
}
