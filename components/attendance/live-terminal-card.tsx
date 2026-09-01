
"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Fingerprint,
  Globe,
  Hash,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui";
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

export function terminalOnline(
  lastSeenAt: string | null,
  isActive = true
) {
  return isActive && isDeviceOnline(lastSeenAt);
}

function statusLabel(device: LiveTerminalCardData) {
  if (!device.isActive) {
    return {
      text: "Disabled",
      tone: "gray" as const,
      live: false,
    };
  }

  if (isDeviceLive(device.lastSeenAt)) {
    return {
      text: "Live",
      tone: "green" as const,
      live: true,
    };
  }

  if (isDeviceOnline(device.lastSeenAt)) {
    return {
      text: "Connected",
      tone: "green" as const,
      live: false,
    };
  }

  if (device.lastSeenAt) {
    return {
      text: "Offline",
      tone: "gray" as const,
      live: false,
    };
  }

  return {
    text: "Not connected",
    tone: "gray" as const,
    live: false,
  };
}

export function LiveTerminalCard({
  device,
  actions,
  compact = false,
  admsUrl,
}: {
  device: LiveTerminalCardData;
  actions?: React.ReactNode;
  compact?: boolean;
  /** The ADMS / aciclock URL the terminal must be set to PUSH to. Shown only when not connected. */
  admsUrl?: string;
}) {
  useLiveClock(30_000);

  const connected = terminalOnline(device.lastSeenAt, device.isActive);
  const live = device.isActive && isDeviceLive(device.lastSeenAt);
  const status = statusLabel(device);

  const endpoint = device.ipAddress
    ? formatDeviceEndpoint(
        device.ipAddress,
        device.commPort ?? DEFAULT_ZK_PORT
      )
    : null;

  const heartbeatValue = device.lastSeenAt
    ? formatRelativeTime(device.lastSeenAt)
    : "Not connected yet";

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-2xl border bg-white transition-all duration-200",
        connected
          ? "border-emerald-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          : "border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md"
      )}
    >
      {/* Header */}
      <div className="relative px-5 pt-5 pb-4">
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-1",
            live
              ? "bg-emerald-500"
              : connected
                ? "bg-emerald-300"
                : "bg-gray-200"
          )}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* Device Icon */}
            <div
              className={cn(
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                connected
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              {connected ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}

              {live && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                </span>
              )}
            </div>

            {/* Name + Status */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-gray-900">
                  {device.name}
                </h3>

                {device.isActive && (
                  <span
                    className={cn(
                      "hidden shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:inline-flex",
                      live
                        ? "bg-emerald-100 text-emerald-700"
                        : connected
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {live ? "Live" : connected ? "Online" : "Offline"}
                  </span>
                )}
              </div>

              {device.branchName && (
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {device.branchName}
                </p>
              )}

              <div
                className={cn(
                  "mt-1.5 flex items-center gap-1.5 text-[11px] font-medium",
                  live
                    ? "text-emerald-600"
                    : connected
                      ? "text-emerald-600"
                      : "text-gray-500"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    live
                      ? "animate-pulse bg-emerald-500"
                      : connected
                        ? "bg-emerald-500"
                        : "bg-gray-300"
                  )}
                />
                {status.text}
              </div>
            </div>
          </div>

          {actions && (
            <div className="shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Live activity summary */}
      <div
        className={cn(
          "mx-5 mb-4 rounded-xl border p-3",
          connected
            ? "border-emerald-100 bg-emerald-50/60"
            : "border-gray-100 bg-gray-50"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                connected
                  ? "bg-white text-emerald-600"
                  : "bg-white text-gray-400"
              )}
            >
              <Activity className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Heartbeat
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs font-semibold",
                  live
                    ? "text-emerald-700"
                    : connected
                      ? "text-amber-700"
                      : "text-gray-600"
                )}
              >
                {heartbeatValue}
              </p>
            </div>
          </div>

          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
              <Radio className="h-3 w-3" />
              Real-time
            </span>
          )}
        </div>
      </div>

      {/* Device information */}
      <div className="grid grid-cols-2 gap-px border-y border-gray-100 bg-gray-100">
        <div className="bg-white px-5 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
            <Hash className="h-3 w-3" />
            Serial
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-gray-800">
            {device.serialNumber ?? "—"}
          </p>
        </div>

        <div className="bg-white px-5 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
            <Globe className="h-3 w-3" />
            Device IP
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-gray-800">
            {endpoint ?? "Not configured"}
          </p>
        </div>
      </div>

      {!connected && admsUrl && (
        <div className="border-t border-amber-100 bg-amber-50/60 px-5 py-3">
          <p className="text-[11px] font-semibold text-amber-800">
            Terminal hasn&apos;t reached Smart HR yet
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
            On the device set Cloud Server (iclock / ADMS) to:
          </p>
          <code className="mt-1 block break-all rounded-md bg-white px-2 py-1 text-[11px] text-gray-800">
            {admsUrl}
          </code>
          <p className="mt-1 text-[11px] text-amber-700">
            Transfer Mode = Real-time (PUSH). It connects on its own.
          </p>
        </div>
      )}

      {/* Today's activity */}
      {(typeof device.todayPunchCount === "number" ||
        device.lastPunchAt) && (
        <div className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
Today&apos;s activity
            </span>

            {typeof device.todayPunchCount === "number" && (
              <span className="text-[10px] font-medium text-gray-400">
                Attendance
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            {typeof device.todayPunchCount === "number" ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Fingerprint className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-base font-bold leading-none text-gray-900">
                    {device.todayPunchCount}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-500">
                    punches
                    {typeof device.todayUserCount === "number"
                      ? ` · ${device.todayUserCount} ${
                          device.todayUserCount === 1
                            ? "person"
                            : "people"
                        }`
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div />
            )}

            {device.lastPunchAt && (
              <div className="min-w-0 text-right">
                <p className="truncate text-[10px] text-gray-400">
                  Last punch
                </p>
                <p className="mt-1 truncate text-xs font-medium text-gray-700">
                  {device.lastPunchName ||
                    `PIN ${device.lastPunchPin ?? "—"}`}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  {formatRelativeTime(device.lastPunchAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      {compact && (
        <Link
          href="/attendance/devices"
          className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50/50"
        >
          <span>Open terminal</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      )}
    </div>
  );
}

export function LiveTerminalActions({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {children}
    </div>
  );
}

export function ConnectButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
    >
      Connect
    </Button>
  );
}
