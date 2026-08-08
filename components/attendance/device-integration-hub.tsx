"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useDeviceLive } from "@/hooks/use-attendance-live";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AttendanceDeviceSpec } from "@/lib/attendance-device-spec";

type DeviceRow = {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
  online?: boolean;
  apiKey?: string;
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
  devices: DeviceRow[];
  masterKeyConfigured: boolean;
};

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25";

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

export function DeviceIntegrationHub() {
  const [docs, setDocs] = useState<DocsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [testKey, setTestKey] = useState("");
  const [testCode, setTestCode] = useState("EMP001");
  const [testAction, setTestAction] = useState<"toggle" | "check_in" | "check_out">("toggle");
  const [testing, setTesting] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/device/docs");
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to load device API"));
        return;
      }
      setDocs(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useDeviceLive(
    useCallback((ping: { deviceId?: string | null; lastSeenAt?: string }) => {
      if (!ping.deviceId) return;
      setDocs((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          devices: prev.devices.map((d) =>
            d.id === ping.deviceId
              ? {
                  ...d,
                  lastSeenAt: ping.lastSeenAt ?? new Date().toISOString(),
                  online: true,
                }
              : d
          ),
          status: {
            ...prev.status,
            onlineDevices: prev.devices.filter((d) =>
              d.id === ping.deviceId ? true : isOnline(d.lastSeenAt)
            ).length,
            message: "Device connected · live via SSE",
          },
        };
      });
    }, [])
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

  const createDevice = async () => {
    if (!newName.trim()) {
      notify.error("Device name is required");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/attendance/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), location: newLocation.trim() || null }),
    });
    setCreating(false);
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to register device"));
      return;
    }
    const data = (await res.json()) as { device: DeviceRow & { apiKey: string } };
    notify.success("Device registered", "Copy the API key now — it won't be shown again.");
    setNewName("");
    setNewLocation("");
    setTestKey(data.device.apiKey);
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
    notify.success(device.isActive ? "Device disabled" : "Device enabled");
    await loadDocs();
  };

  const regenerateKey = async (device: DeviceRow) => {
    const res = await fetch(`/api/attendance/devices/${device.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateKey: true }),
    });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to regenerate key"));
      return;
    }
    const data = (await res.json()) as { device: { apiKey: string } };
    notify.success("New API key generated");
    setTestKey(data.device.apiKey);
    await loadDocs();
  };

  const removeDevice = async (device: DeviceRow) => {
    if (!confirm(`Delete device "${device.name}"?`)) return;
    const res = await fetch(`/api/attendance/devices/${device.id}`, { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to delete device"));
      return;
    }
    notify.success("Device removed");
    await loadDocs();
  };

  const testPunch = async () => {
    if (!testKey.trim()) {
      notify.error("Enter a device API key to test");
      return;
    }
    setTesting(true);
    const url = docs?.spec.endpoints.punch.url ?? "/api/attendance/device";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Key": testKey.trim(),
      },
      body: JSON.stringify({
        action: testAction,
        employeeCode: testCode.trim(),
        externalId: `test-${Date.now()}`,
      }),
    });
    setTesting(false);
    if (!res.ok) {
      notify.error(await readApiError(res, "Test punch failed"));
      return;
    }
    const data = await res.json();
    notify.success(
      `Punch recorded: ${data.action}`,
      `Status ${data.status}${data.duplicate ? " (duplicate)" : ""}`
    );
  };

  const pingDevice = async () => {
    if (!testKey.trim()) {
      notify.error("Enter a device API key to ping");
      return;
    }
    setTesting(true);
    const url = docs?.spec.endpoints.health.url ?? "/api/attendance/device";
    const res = await fetch(url, {
      headers: { "X-Device-Key": testKey.trim() },
    });
    setTesting(false);
    if (!res.ok) {
      notify.error(await readApiError(res, "Device ping failed"));
      return;
    }
    notify.success("Device ping successful", "Connected to Smart HR");
    await loadDocs();
  };

  if (loading && !docs) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading device API…
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
  const punchUrl = spec.endpoints.punch.url;
  const syncUrl = spec.endpoints.sync.url;

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
        <div className="flex flex-wrap gap-2">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 border border-brand-100 rounded-xl hover:bg-brand-100"
          >
            <BookOpen className="w-4 h-4" />
            Full API docs
          </Link>
          <Button variant="secondary" size="sm" onClick={loadDocs}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/60 via-white to-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Check-in device API</h2>
                <p className="text-sm text-gray-500">
                  Connect kiosk, biometric, or mobile check-in apps in real time
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
                {onlineCount > 0 ? status.message : "Waiting for device ping"}
              </span>
              <span className="text-gray-400">· Live updates via SSE</span>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>API v{spec.version}</p>
            <p className="mt-1">{appUrl}</p>
            {docs.masterKeyConfigured && (
              <p className="mt-1 text-brand-600">Master key configured in .env</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">API endpoints</h3>
            <div className="space-y-3">
              {Object.entries(spec.endpoints).map(([key, ep]) => (
                <div key={key} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[11px] font-semibold uppercase text-gray-400">{key}</p>
                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {ep.method}
                    </span>
                  </div>
                  <code className="text-xs text-gray-800 break-all">{ep.url}</code>
                  <p className="text-[11px] text-gray-500 mt-1">{ep.description}</p>
                  <button
                    type="button"
                    onClick={() => copy(ep.url, key)}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600"
                  >
                    {copied === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy URL
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Device request format</h3>
            <p className="text-xs text-gray-600 mb-2">
              Header:{" "}
              <code className="bg-gray-50 px-1 rounded">X-Device-Key: your-api-key</code>
            </p>
            <pre className="bg-gray-50 rounded-xl p-4 overflow-x-auto text-[11px] text-gray-800">{`POST ${punchUrl}
{
  "action": "check_in" | "check_out" | "toggle",
  "employeeCode": "EMP001",
  "timestamp": "${new Date().toISOString()}",
  "externalId": "device-event-12345"
}`}</pre>
            <p className="text-xs text-gray-500 mt-3">{spec.realtime.description}</p>
            <p className="text-xs text-gray-500 mt-1">
              SSE: <code className="bg-gray-50 px-1 rounded">{spec.realtime.url}</code>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Register device</h3>
            <div className="space-y-3">
              <input
                className={inputClass}
                placeholder="Device name (e.g. Reception Kiosk)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Location (optional)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
              <Button onClick={createDevice} loading={creating}>
                <Plus className="w-4 h-4" />
                Add device
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Test connection</h3>
            <div className="space-y-3">
              <input
                className={inputClass}
                placeholder="Device API key"
                value={testKey}
                onChange={(e) => setTestKey(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  placeholder="Employee code"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                />
                <select
                  className={inputClass}
                  value={testAction}
                  onChange={(e) =>
                    setTestAction(e.target.value as "toggle" | "check_in" | "check_out")
                  }
                >
                  <option value="toggle">toggle</option>
                  <option value="check_in">check_in</option>
                  <option value="check_out">check_out</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={pingDevice} loading={testing}>
                  <Wifi className="w-4 h-4" />
                  Ping API
                </Button>
                <Button onClick={testPunch} loading={testing}>
                  <Send className="w-4 h-4" />
                  Test punch
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Connected devices ({docs.devices.length})
            </h3>
            {docs.devices.length === 0 ? (
              <p className="text-sm text-gray-500">No devices registered yet.</p>
            ) : (
              <div className="space-y-2">
                {docs.devices.map((device) => {
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
                            {device.location ?? "No location"}
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
                          onClick={() => regenerateKey(device)}
                          className="text-[11px] text-gray-500 hover:underline"
                        >
                          New key
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

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Batch sync</h3>
            <code className="text-xs text-gray-800 break-all">{syncUrl}</code>
            <pre className="mt-3 bg-gray-50 rounded-xl p-3 overflow-x-auto text-[11px]">{JSON.stringify(
              spec.syncRequest.bodyExample,
              null,
              2
            )}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
