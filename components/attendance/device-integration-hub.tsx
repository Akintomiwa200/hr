"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  Fingerprint,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useDeviceLive } from "@/hooks/use-attendance-live";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AttendanceDeviceSpec } from "@/lib/attendance-device-spec";
import { BRANCH_TIMEZONES } from "@/lib/zkteco/timezones";

type BranchRow = {
  id: string;
  name: string;
  location: string;
  timezone: string;
  isActive: boolean;
  _count: { employees: number; devices: number };
};

type DeviceRow = {
  id: string;
  name: string;
  location: string | null;
  vendor?: string;
  serialNumber: string | null;
  model: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
  online?: boolean;
  branchId: string | null;
  branch: { id: string; name: string; location: string; timezone: string } | null;
};

type DocsResponse = {
  appUrl: string;
  spec: AttendanceDeviceSpec;
  status: {
    message: string;
    onlineDevices: number;
    totalDevices: number;
    liveUpdates: string;
  };
  branches: BranchRow[];
  devices: DeviceRow[];
  masterKeyConfigured: boolean;
};

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25";

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

function isLoopbackHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

function cloudServerForThisPlace(
  specCloud: AttendanceDeviceSpec["zkteco"]["cloudServer"] | undefined,
  appUrl: string
) {
  const path = specCloud?.path ?? "/iclock";
  if (typeof window !== "undefined") {
    const { hostname, port, protocol, origin } = window.location;
    if (hostname && !isLoopbackHost(hostname)) {
      return {
        host: hostname,
        portHint: port || (protocol === "https:" ? "443" : "80"),
        path,
        protocol: protocol.replace(":", ""),
        origin,
      };
    }
  }
  if (specCloud?.host) return specCloud;
  try {
    const url = new URL(appUrl.includes("://") ? appUrl : `http://${appUrl}`);
    return {
      host: url.hostname,
      portHint: url.port || (url.protocol === "https:" ? "443" : "80"),
      path,
      protocol: url.protocol.replace(":", ""),
      origin: url.origin,
    };
  } catch {
    return {
      host: specCloud?.host || "localhost",
      portHint: specCloud?.portHint || "3000",
      path,
      protocol: specCloud?.protocol || "http",
      origin: specCloud?.origin || appUrl || "http://localhost:3000",
    };
  }
}

export function DeviceIntegrationHub() {
  const [docs, setDocs] = useState<DocsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [creatingDevice, setCreatingDevice] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [branchTimezone, setBranchTimezone] = useState("Africa/Lagos");
  const [deviceName, setDeviceName] = useState("");
  const [deviceSn, setDeviceSn] = useState("");
  const [deviceBranchId, setDeviceBranchId] = useState("");
  const [deviceModel, setDeviceModel] = useState("");

  const loadDocs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/attendance/device/docs");
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to load ZKTeco console"));
        return;
      }
      const data = (await res.json()) as Partial<DocsResponse>;
      if (!data.spec) {
        notify.error("Failed to load ZKTeco console");
        return;
      }
      setDocs({
        appUrl: data.appUrl ?? "",
        spec: data.spec,
        status: data.status ?? {
          message: "Waiting for ZKTeco terminals",
          onlineDevices: 0,
          totalDevices: 0,
          liveUpdates: "",
        },
        branches: data.branches ?? [],
        devices: data.devices ?? [],
        masterKeyConfigured: Boolean(data.masterKeyConfigured),
      });
      setDeviceBranchId((prev) => prev || data.branches?.[0]?.id || "");
    } catch {
      notify.error("Failed to load ZKTeco console");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useDeviceLive(
    useCallback(() => {
      void loadDocs(true);
    }, [loadDocs])
  );

  const onlineCount = useMemo(
    () => docs?.devices.filter((d) => d.isActive && isOnline(d.lastSeenAt)).length ?? 0,
    [docs]
  );

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    notify.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const createBranch = async () => {
    if (!branchName.trim() || !branchLocation.trim()) {
      notify.error("Branch name and location are required");
      return;
    }
    setCreatingBranch(true);
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: branchName.trim(),
        location: branchLocation.trim(),
        timezone: branchTimezone,
      }),
    });
    setCreatingBranch(false);
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to create branch"));
      return;
    }
    const data = (await res.json()) as { branch: BranchRow };
    notify.success("Branch added", data.branch.location);
    setBranchName("");
    setBranchLocation("");
    setDeviceBranchId(data.branch.id);
    await loadDocs();
  };

  const removeBranch = async (branch: BranchRow) => {
    if (!confirm(`Delete branch "${branch.name}"?`)) return;
    const res = await fetch(`/api/branches/${branch.id}`, { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to delete branch"));
      return;
    }
    notify.success("Branch removed");
    await loadDocs();
  };

  const createDevice = async () => {
    if (!deviceName.trim() || !deviceSn.trim() || !deviceBranchId) {
      notify.error("Name, serial number, and branch are required");
      return;
    }
    setCreatingDevice(true);
    const res = await fetch("/api/attendance/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: deviceName.trim(),
        serialNumber: deviceSn.trim(),
        branchId: deviceBranchId,
        model: deviceModel.trim() || null,
      }),
    });
    setCreatingDevice(false);
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to register terminal"));
      return;
    }
    notify.success("ZKTeco terminal registered", "Configure Cloud Server / ADMS on the device.");
    setDeviceName("");
    setDeviceSn("");
    setDeviceModel("");
    await loadDocs();
  };

  const toggleDevice = async (device: DeviceRow) => {
    const res = await fetch(`/api/attendance/devices/${device.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !device.isActive }),
    });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to update device"));
      return;
    }
    notify.success(device.isActive ? "Terminal disabled" : "Terminal enabled");
    await loadDocs();
  };

  const removeDevice = async (device: DeviceRow) => {
    if (!confirm(`Delete terminal "${device.name}"?`)) return;
    const res = await fetch(`/api/attendance/devices/${device.id}`, { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to delete device"));
      return;
    }
    notify.success("Terminal removed");
    await loadDocs();
  };

  if (loading && !docs) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading ZKTeco console…
      </div>
    );
  }

  if (!docs) {
    return (
      <div className="text-center py-20 text-gray-500">
        Could not load device integration.{" "}
        <button type="button" onClick={loadDocs} className="text-brand-600 font-medium">
          Retry
        </button>
      </div>
    );
  }

  const { spec, appUrl, status } = docs;
  const cloud = cloudServerForThisPlace(spec.zkteco?.cloudServer, appUrl);
  const setupSteps = spec.zkteco?.setup ?? [];
  const grouped = (docs.branches ?? []).map((branch) => ({
    branch,
    devices: docs.devices.filter((d) => d.branchId === branch.id),
  }));
  const unassigned = docs.devices.filter((d) => !d.branchId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to attendance
        </Link>
        <Button variant="secondary" size="sm" onClick={loadDocs}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/60 via-white to-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">ZKTeco branch terminals</h2>
                <p className="text-sm text-gray-500">
                  Real-time ADMS push from every office location — fingerprint, face, and card
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium",
                  onlineCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    onlineCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                  )}
                />
                {onlineCount > 0 ? status.message : "Waiting for terminals"}
              </span>
              <span className="text-gray-400">· Live punches via ADMS + SSE</span>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>ADMS {spec.zkteco?.protocol ?? "iclock"}</p>
            <p className="mt-1">{cloud.origin || appUrl}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Cloud server for every terminal</h3>
        <p className="text-xs text-gray-500 mb-4">
          These values follow the address you used to open Smart HR — public domain, public IP, or
          this office LAN — not localhost on the device. Every branch terminal points here; serial
          number maps the punch to that office.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: "host", label: "Server address", value: cloud.host },
            { key: "port", label: "Port", value: cloud.portHint },
            { key: "path", label: "Server path", value: cloud.path },
          ].map((item) => (
            <div key={item.key} className="rounded-xl border border-gray-100 p-3">
              <p className="text-[11px] font-semibold uppercase text-gray-400">{item.label}</p>
              <code className="text-sm text-gray-900 break-all">{item.value}</code>
              <button
                type="button"
                onClick={() => copy(item.value, item.key)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600"
              >
                {copied === item.key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
            </div>
          ))}
        </div>
        <ol className="mt-4 space-y-1.5 text-xs text-gray-600 list-decimal pl-4">
          {setupSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Company branches</h3>
          <p className="text-xs text-gray-500 mb-3">
            Each office location gets its own timezone so late/present is calculated locally.
          </p>
          <div className="space-y-3">
            <input
              className={inputClass}
              placeholder="Branch name (e.g. Lagos HQ)"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Location (city / address)"
              value={branchLocation}
              onChange={(e) => setBranchLocation(e.target.value)}
            />
            <select
              className={inputClass}
              value={branchTimezone}
              onChange={(e) => setBranchTimezone(e.target.value)}
            >
              {BRANCH_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <Button onClick={createBranch} loading={creatingBranch}>
              <Plus className="w-4 h-4" />
              Add branch
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {docs.branches.length === 0 ? (
              <p className="text-sm text-gray-500">No branches yet. Add each office location first.</p>
            ) : (
              docs.branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{branch.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        <MapPin className="w-3 h-3 inline mr-0.5" />
                        {branch.location} · {branch.timezone}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {branch._count.devices} terminal{branch._count.devices === 1 ? "" : "s"} ·{" "}
                        {branch._count.employees} staff
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBranch(branch)}
                    className="text-[11px] text-red-500 hover:underline inline-flex items-center gap-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Register ZKTeco terminal</h3>
          <p className="text-xs text-gray-500 mb-3">
            Serial number is on the back of the device or under System → Device Info.
          </p>
          <div className="space-y-3">
            <input
              className={inputClass}
              placeholder="Terminal name (e.g. Reception SpeedFace)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Serial number (SN)"
              value={deviceSn}
              onChange={(e) => setDeviceSn(e.target.value)}
            />
            <select
              className={inputClass}
              value={deviceBranchId}
              onChange={(e) => setDeviceBranchId(e.target.value)}
            >
              <option value="">Select branch</option>
              {docs.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} — {branch.location}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Model (optional, e.g. MB360)"
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
            />
            <Button onClick={createDevice} loading={creatingDevice} disabled={docs.branches.length === 0}>
              <Plus className="w-4 h-4" />
              Add terminal
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Live terminals ({docs.devices.length})
        </h3>
        {docs.devices.length === 0 ? (
          <p className="text-sm text-gray-500">No ZKTeco terminals registered yet.</p>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ branch, devices }) => (
              <div key={branch.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  {branch.name} · {branch.location}
                </p>
                {devices.length === 0 ? (
                  <p className="text-sm text-gray-400 pl-1">No terminal at this branch yet.</p>
                ) : (
                  <div className="space-y-2">
                    {devices.map((device) => {
                      const online = device.isActive && isOnline(device.lastSeenAt);
                      return (
                        <div
                          key={device.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                online ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                              )}
                            >
                              {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{device.name}</p>
                              <p className="text-[11px] text-gray-500 truncate">
                                SN {device.serialNumber ?? "—"}
                                {device.model ? ` · ${device.model}` : ""}
                                {!device.isActive && " · Disabled"}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {device.lastSeenAt
                                  ? `Last seen ${new Date(device.lastSeenAt).toLocaleString()}`
                                  : "Never connected"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleDevice(device)}
                              className="text-[11px] text-brand-600 hover:underline"
                            >
                              {device.isActive ? "Disable" : "Enable"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDevice(device)}
                              className="text-[11px] text-red-500 hover:underline inline-flex items-center gap-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {unassigned.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Unassigned
                </p>
                {unassigned.map((device) => (
                  <p key={device.id} className="text-sm text-gray-600">
                    {device.name} · SN {device.serialNumber ?? "—"}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
