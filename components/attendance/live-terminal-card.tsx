"use client";

import Link from "next/link";
import { Fingerprint, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui";
import { cn, formatRelativeTime } from "@/lib/utils";
import { DEFAULT_ZK_PORT, formatDeviceEndpoint } from "@/lib/zkteco/device-ip";
import { isDeviceLive, isDeviceOnline } from "@/lib/attendance-device-spec";

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
  if (!device.isActive) return { text: "Disabled", tone: "gray" as const, live: false };
  if (isDeviceLive(device.lastSeenAt)) {
    return { text: "Live", tone: "green" as const, live: true };
  }
  if (isDeviceOnline(device.lastSeenAt)) {
    return { text: "Connected", tone: "green" as const, live: false };
  }
  if (device.lastSeenAt) {
    return { text: "Offline", tone: "gray" as const, live: false };
  }
  return { text: "Waiting for first link", tone: "gray" as const, live: false };
}

export function LiveTerminalCard({
  device,
  actions,
  compact = false,
}: {
  device: LiveTerminalCardData;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  const connected = terminalOnline(device.lastSeenAt, device.isActive);
  const status = statusLabel(device);
  const endpoint = device.ipAddress
    ? formatDeviceEndpoint(device.ipAddress, device.commPort ?? DEFAULT_ZK_PORT)
    : null;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4",
        connected ? "border-emerald-200 shadow-[0_1px_3px_rgba(16,185,129,0.12)]" : "border-gray-100"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              connected ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
            )}
          >
            {connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 truncate">{device.name}</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                  status.tone === "green" && "bg-emerald-50 text-emerald-700",
                  status.tone === "gray" && "bg-gray-100 text-gray-500"
                )}
              >
                {status.tone === "green" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                {status.text}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              PUSH · Real-time
              {device.branchName ? ` · ${device.branchName}` : ""}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              SN {device.serialNumber ?? "—"}
              {endpoint ? ` · Device IP ${endpoint}` : " · No Device IP yet"}
            </p>
            {connected && device.lastSeenAt && (
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {status.text === "Live"
                  ? `Heartbeat ${formatRelativeTime(device.lastSeenAt)}`
                  : `Connected · last signal ${formatRelativeTime(device.lastSeenAt)}`}
              </p>
            )}
            {!connected && device.lastSeenAt && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                No signal since {formatRelativeTime(device.lastSeenAt)} — device off or no internet
              </p>
            )}
            {typeof device.todayPunchCount === "number" && device.todayPunchCount > 0 && (
              <p className="text-[11px] text-gray-700 mt-1">
                {device.todayPunchCount} thumbprint{device.todayPunchCount === 1 ? "" : "s"} today
                {typeof device.todayUserCount === "number"
                  ? ` · ${device.todayUserCount} ${device.todayUserCount === 1 ? "person" : "people"}`
                  : ""}
              </p>
            )}
            {device.lastPunchAt && (
              <p className="text-[11px] text-brand-700 mt-1 inline-flex items-center gap-1">
                <Fingerprint className="w-3 h-3" />
                Last: {device.lastPunchName || `PIN ${device.lastPunchPin ?? "—"}`} ·{" "}
                {formatRelativeTime(device.lastPunchAt)}
              </p>
            )}
          </div>
        </div>
        {actions}
      </div>
      {compact && (
        <Link
          href="/attendance/devices"
          className="mt-3 inline-block text-[11px] font-medium text-brand-600 hover:underline"
        >
          Open terminal
        </Link>
      )}
    </div>
  );
}

export function LiveTerminalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1 shrink-0 items-end">{children}</div>;
}

export function ConnectButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button size="sm" variant="secondary" onClick={onClick} disabled={disabled}>
      Connect
    </Button>
  );
}
