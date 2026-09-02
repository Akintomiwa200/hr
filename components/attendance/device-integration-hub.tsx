"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  Fingerprint,
  MapPin,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { LiveTerminalCard } from "@/components/attendance/live-terminal-card";
import { useDeviceLive } from "@/hooks/use-attendance-live";
import { usePollingFetch } from "@/hooks/use-polling-fetch";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { isDeviceOnline, isDeviceLive, type AttendanceDeviceSpec } from "@/lib/attendance-device-spec";
import { BRANCH_TIMEZONES } from "@/lib/zkteco/timezones";
import { DEFAULT_ZK_PORT } from "@/lib/zkteco/device-ip";

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
  ipAddress?: string | null;
  commPort?: number | null;
  lastPunchAt?: string | null;
  lastPunchPin?: string | null;
};

type DocsResponse = {
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
  return isDeviceOnline(lastSeenAt);
}

type DeviceStatusRow = {
  id: string;
  lastSeenAt: string | null;
  isActive: boolean;
  lastPunchAt: string | null;
  lastPunchPin: string | null;
};

function mergeDeviceStatus(devices: DeviceRow[], statusRows: DeviceStatusRow[]) {
  if (statusRows.length === 0) return devices;
  const byId = new Map(statusRows.map((row) => [row.id, row]));
  return devices.map((device) => {
    const row = byId.get(device.id);
    if (!row) return device;
    return {
      ...device,
      lastSeenAt: row.lastSeenAt,
      isActive: row.isActive,
      lastPunchAt: row.lastPunchAt,
      lastPunchPin: row.lastPunchPin,
    };
  });
}

export function DeviceIntegrationHub() {
  const [docs, setDocs] = useState<DocsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [creatingDevice, setCreatingDevice] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [branchTimezone, setBranchTimezone] = useState("Africa/Lagos");
  const [deviceName, setDeviceName] = useState("");
  const [deviceSn, setDeviceSn] = useState("");
  const [deviceIp, setDeviceIp] = useState("");
  const [devicePort, setDevicePort] = useState(String(DEFAULT_ZK_PORT));
  const [deviceBranchId, setDeviceBranchId] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [connectDevice, setConnectDevice] = useState<DeviceRow | null>(null);
  const [branchSheetOpen, setBranchSheetOpen] = useState(false);
  const [deviceSheetOpen, setDeviceSheetOpen] = useState(false);
  const [sheetName, setSheetName] = useState("");
  const [sheetSn, setSheetSn] = useState("");
  const [sheetBranchId, setSheetBranchId] = useState("");
  const [sheetIp, setSheetIp] = useState("");
  const [sheetPort, setSheetPort] = useState(String(DEFAULT_ZK_PORT));
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [pullingId, setPullingId] = useState<string | null>(null);
  const [connectNote, setConnectNote] = useState<string | null>(null);
  const [copiedSheetAdms, setCopiedSheetAdms] = useState(false);
  const connectAbortRef = useRef<AbortController | null>(null);

  const loadDocsAbortRef = useRef<AbortController | null>(null);
  const loadDocs = useCallback(async (silent = false, signal?: AbortSignal) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/attendance/device/docs", { signal });
      if (signal?.aborted) return;
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to load ZKTeco console"));
        return;
      }
      const data = (await res.json()) as Partial<DocsResponse>;
      if (signal?.aborted) return;
      if (!data.spec) {
        notify.error("Failed to load ZKTeco console");
        return;
      }
      setDocs({
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
      setConnectDevice((prev) => {
        if (!prev) return prev;
        return (data.devices ?? []).find((d) => d.id === prev.id) ?? prev;
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      notify.error("Failed to load ZKTeco console");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/attendance/devices/status", { signal });
      if (!res.ok || signal.aborted) return;
      const payload = (await res.json()) as { devices?: DeviceStatusRow[] };
      if (signal.aborted || !payload.devices?.length) return;
      setDocs((prev) => {
        if (!prev) return prev;
        return { ...prev, devices: mergeDeviceStatus(prev.devices, payload.devices!) };
      });
      setConnectDevice((prev) => {
        if (!prev) return prev;
        const row = payload.devices!.find((d) => d.id === prev.id);
        if (!row) return prev;
        return {
          ...prev,
          lastSeenAt: row.lastSeenAt,
          isActive: row.isActive,
          lastPunchAt: row.lastPunchAt ?? undefined,
          lastPunchPin: row.lastPunchPin ?? undefined,
        };
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }, []);

  useEffect(() => {
    loadDocsAbortRef.current?.abort();
    const controller = new AbortController();
    loadDocsAbortRef.current = controller;
    void loadDocs(false, controller.signal);
    return () => {
      controller.abort();
      loadDocsAbortRef.current = null;
    };
  }, [loadDocs]);

  useDeviceLive(
    useCallback(() => {
      void refreshStatus(new AbortController().signal);
    }, [refreshStatus])
  );

  usePollingFetch(refreshStatus, { intervalMs: 5_000 });
  usePollingFetch(
    (signal) => loadDocs(true, signal),
    { intervalMs: 60_000 }
  );

  const onlineCount = useMemo(
    () => docs?.devices.filter((d) => d.isActive && isOnline(d.lastSeenAt)).length ?? 0,
    [docs]
  );

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
    setBranchSheetOpen(false);
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
        ipAddress: deviceIp.trim() || null,
        commPort: devicePort.trim() ? Number(devicePort) : DEFAULT_ZK_PORT,
      }),
    });
    setCreatingDevice(false);
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to register terminal"));
      return;
    }
    notify.success("ZKTeco terminal registered", "Open Connect and enter the hardware IP.");
    setDeviceName("");
    setDeviceSn("");
    setDeviceModel("");
    setDeviceIp("");
    setDevicePort(String(DEFAULT_ZK_PORT));
    await loadDocs();
    setDeviceSheetOpen(false);
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

  const openConnect = (device: DeviceRow) => {
    setConnectDevice(device);
    setSheetName(device.name);
    setSheetSn(device.serialNumber ?? "");
    setSheetBranchId(device.branchId ?? "");
    setSheetIp(device.ipAddress ?? "");
    setSheetPort(String(device.commPort || DEFAULT_ZK_PORT));
    setConnectNote(
      isDeviceLive(device.lastSeenAt)
        ? "Auto-connect: this terminal is already pushing to Smart HR right now. Confirm applies instantly — no wait."
        : device.online
          ? "This terminal is already connected. Confirm will apply the details instantly."
          : "Enter the hardware IP, then Confirm to connect."
    );
  };

  const connectRealtime = async () => {
    if (!connectDevice) return;
    if (!sheetIp.trim()) {
      notify.error("Enter the hardware IP address");
      return;
    }
    setSyncingId(connectDevice.id);
    setConnectNote(
      isDeviceLive(connectDevice.lastSeenAt)
        ? "Auto-connecting…"
        : `Checking ${sheetIp.trim()}:${Number(sheetPort) || DEFAULT_ZK_PORT}…`
    );
    connectAbortRef.current?.abort();
    const controller = new AbortController();
    connectAbortRef.current = controller;
    try {
      const res = await fetch(`/api/attendance/devices/${connectDevice.id}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: sheetName.trim(),
          serialNumber: sheetSn.trim(),
          branchId: sheetBranchId,
          ipAddress: sheetIp.trim(),
          commPort: Number(sheetPort) || DEFAULT_ZK_PORT,
        }),
      });
      if (connectAbortRef.current !== controller) return;
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not save the terminal"));
        setConnectNote("Could not save — check the details and try again.");
        return;
      }
      const data = (await res.json()) as {
        reachedDevice?: boolean;
        realtime?: "live" | "waiting";
        processed?: number;
        unmatched?: number;
        logsDownloaded?: number;
        ipAddress?: string | null;
        commPort?: number | null;
        serialNumber?: string | null;
        message?: string;
        probe?: string;
      };
      if (connectAbortRef.current !== controller) return;
      if (data.ipAddress) setSheetIp(data.ipAddress);
      if (data.commPort) setSheetPort(String(data.commPort));
      void loadDocs(true);
      const outcome = data.message || "Terminal saved. It auto-connects when it reaches Smart HR.";
      setConnectNote(outcome);
      if (data.realtime === "live") {
        notify.success("Connected", outcome);
      } else {
        notify.success("Saved", outcome);
      }
      void refreshStatus(new AbortController().signal);
    } catch (err) {
      if (connectAbortRef.current !== controller) return;
      const outcome =
        err instanceof Error && err.name === "AbortError"
          ? "Still saving — this usually means the server is busy. No error was applied."
          : "Could not reach Smart HR to save. Check the page is still online and try again.";
      setConnectNote(outcome);
      notify.error("Could not confirm", outcome);
    } finally {
      if (connectAbortRef.current === controller) {
        connectAbortRef.current = null;
        setSyncingId(null);
      }
    }
  };

  const syncDeviceLogs = async (device: DeviceRow) => {
    if (!device.ipAddress) {
      notify.error("Enter Device IP on Connect first");
      return;
    }
    setPullingId(device.id);
    try {
      const res = await fetch(`/api/attendance/devices/${device.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: device.ipAddress ?? undefined,
          commPort: device.commPort ?? DEFAULT_ZK_PORT,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not download device logs"));
        return;
      }
      const data = (await res.json()) as {
        logsDownloaded?: number;
        processed?: number;
        unmatched?: number;
      };
      notify.success(
        "Device logs synced",
        `${data.logsDownloaded ?? 0} downloaded · ${data.processed ?? 0} matched · ${data.unmatched ?? 0} on device only`
      );
      void loadDocs(true);
      void refreshStatus(new AbortController().signal);
    } catch {
      notify.error("Could not download device logs");
    } finally {
      setPullingId(null);
    }
  };

  const renderTerminalRow = (device: DeviceRow) => {
    const live = docs?.devices.find((d) => d.id === device.id) ?? device;
    const admsUrl = docs
      ? `${docs.spec.zkteco.cloudServer.origin}${docs.spec.zkteco.cloudServer.path || "/iclock"}`
      : undefined;
    return (
      <LiveTerminalCard
        key={device.id}
        admsUrl={admsUrl}
        onClick={() => openConnect(live)}
        device={{
          id: live.id,
          name: live.name,
          serialNumber: live.serialNumber,
          ipAddress: live.ipAddress,
          commPort: live.commPort,
          lastSeenAt: live.lastSeenAt,
          isActive: live.isActive,
          branchName: live.branch?.name ?? null,
          lastPunchAt: live.lastPunchAt,
          lastPunchPin: live.lastPunchPin,
        }}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                openConnect(live);
              }}
              disabled={!live.isActive}
              className="rounded-xl text-xs font-semibold px-3"
            >
              Connect / Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                void syncDeviceLogs(live);
              }}
              disabled={!live.isActive || pullingId === live.id}
              loading={pullingId === live.id}
              className="rounded-xl text-xs font-semibold px-3"
            >
              Sync logs
            </Button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleDevice(live);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200/60"
            >
              {live.isActive ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeDevice(live);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 rounded-xl hover:bg-red-50 transition-colors border border-red-100 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        }
      />
    );
  };

  if (loading && !docs) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="flex gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <Skeleton className="h-4 w-36 mb-3" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!docs) {
    return (
      <div className="text-center py-20 text-gray-500">
        Could not load device integration.{" "}
        <button type="button" onClick={() => void loadDocs()} className="text-brand-600 font-medium">
          Retry
        </button>
      </div>
    );
  }

  const { status } = docs;
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
        <Button variant="secondary" size="sm" onClick={() => void loadDocs()}>
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
                  Enter the hardware Device IP. Transfer mode is real-time PUSH.
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
          <div className="rounded-xl bg-white/80 px-3 py-2 text-xs font-medium text-brand-700">PUSH · Real-time</div>
        </div>
        {docs.devices.length === 0 && <div className="mt-5 grid gap-2 sm:grid-cols-3 text-xs">
          {[
            ["1", "Add a branch", "Sets the local timezone and office location."],
            ["2", "Register terminal", "Save its serial number and hardware IP."],
            ["3", "Confirm live status", "A heartbeat turns the terminal Live automatically."],
          ].map(([step, title, copy]) => (
            <div key={step} className="flex gap-2 rounded-xl border border-brand-100 bg-white/80 p-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{step}</span>
              <div><p className="font-semibold text-gray-800">{title}</p><p className="mt-0.5 text-gray-500">{copy}</p></div>
            </div>
          ))}
        </div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">1</span><h3 className="text-sm font-semibold text-gray-900">Company branches</h3></div>
          <p className="text-xs text-gray-500 mb-3">
            Each office location gets its own timezone so late/present is calculated locally.
          </p>
          <div className="space-y-2">
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
          <Button className="mt-4 w-full" onClick={() => setBranchSheetOpen(true)}>
            <Plus className="w-4 h-4" />
            Add branch
          </Button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">2</span><h3 className="text-sm font-semibold text-gray-900">Register ZKTeco terminal</h3></div>
          <p className="text-xs text-gray-500 mb-3">
            Serial number is on the back of the device. Device IP is the hardware address, e.g.
            102.88.54.109.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-3 py-3">
            <p className="text-xs text-gray-500">
              {docs.branches.length === 0
                ? "Add a branch first so each terminal has the right location and timezone."
                : `${docs.branches.length} branch${docs.branches.length === 1 ? "" : "es"} available for this terminal.`}
            </p>
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => setDeviceSheetOpen(true)}
            disabled={docs.branches.length === 0}
          >
            <Plus className="w-4 h-4" />
            Register terminal
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Live terminals ({docs.devices.length})
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Device IP is the hardware address. Everyone on the terminal appears in Attendance
          thumbprints — matched staff also show on the daily roster. Use Sync logs for a full
          download from the machine.
        </p>
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
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {devices.map((device) => renderTerminalRow(device))}
                  </div>
                )}
              </div>
            ))}
            {unassigned.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Unassigned
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {unassigned.map((device) => renderTerminalRow(device))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet
        open={branchSheetOpen}
        onClose={() => {
          if (creatingBranch) return;
          setBranchSheetOpen(false);
        }}
        title="Add company branch"
        description="Each office gets its own timezone so late/present is calculated locally."
        width="md"
      >
        <div className="p-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Branch name</span>
            <input
              className={inputClass}
              placeholder="e.g. Lagos HQ"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              disabled={creatingBranch}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Location</span>
            <input
              className={inputClass}
              placeholder="City / address"
              value={branchLocation}
              onChange={(e) => setBranchLocation(e.target.value)}
              disabled={creatingBranch}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Timezone</span>
            <select
              className={inputClass}
              value={branchTimezone}
              onChange={(e) => setBranchTimezone(e.target.value)}
              disabled={creatingBranch}
            >
              {BRANCH_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setBranchSheetOpen(false)} disabled={creatingBranch}>
            Cancel
          </Button>
          <Button onClick={() => void createBranch()} loading={creatingBranch}>
            <Plus className="w-4 h-4" />
            Add branch
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={deviceSheetOpen}
        onClose={() => {
          if (creatingDevice) return;
          setDeviceSheetOpen(false);
        }}
        title="Register ZKTeco terminal"
        description="Serial number is on the back of the device. Transfer mode is real-time PUSH."
        width="lg"
      >
        <div className="p-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Terminal name</span>
            <input
              className={inputClass}
              placeholder="e.g. Reception SpeedFace"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={creatingDevice}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Serial number (SN)</span>
            <input
              className={inputClass}
              placeholder="On the back of the device"
              value={deviceSn}
              onChange={(e) => setDeviceSn(e.target.value)}
              disabled={creatingDevice}
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1.5 col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Device IP</span>
              <input
                className={inputClass}
                placeholder="102.88.54.109"
                value={deviceIp}
                onChange={(e) => setDeviceIp(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                disabled={creatingDevice}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Port</span>
              <input
                className={inputClass}
                placeholder={String(DEFAULT_ZK_PORT)}
                value={devicePort}
                onChange={(e) => setDevicePort(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                disabled={creatingDevice}
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Area / branch</span>
            <select
              className={inputClass}
              value={deviceBranchId}
              onChange={(e) => setDeviceBranchId(e.target.value)}
              disabled={creatingDevice}
            >
              <option value="">Select branch</option>
              {docs.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} — {branch.location}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Model (optional)</span>
            <input
              className={inputClass}
              placeholder="e.g. MB360"
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              disabled={creatingDevice}
            />
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeviceSheetOpen(false)} disabled={creatingDevice}>
            Cancel
          </Button>
          <Button
            onClick={() => void createDevice()}
            loading={creatingDevice}
            disabled={docs.branches.length === 0}
          >
            <Plus className="w-4 h-4" />
            Register terminal
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(connectDevice)}
        onClose={() => {
          if (syncingId) return;
          setConnectDevice(null);
        }}
        title={connectDevice ? `Device Details: ${connectDevice.name}` : "Edit device"}
        description="Edit terminal properties, hardware IP, and view real-time ADMS PUSH configuration."
        width="lg"
      >
        <div className="p-6 space-y-5">
          {/* Header Status Banner */}
          {connectDevice && (
            <div className="rounded-2xl border border-gray-100 bg-slate-50/80 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900">{sheetName || connectDevice.name}</h4>
                <p className="text-xs text-gray-500 font-mono mt-0.5">SN: {sheetSn || "—"}</p>
              </div>

              <div className="flex items-center gap-2">
                {isDeviceLive(connectDevice.lastSeenAt) ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live now
                  </span>
                ) : connectDevice.online ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Awaiting Connection
                  </span>
                )}
                {connectDevice.lastSeenAt && (
                  <span className="text-xs text-gray-500">
                    Last seen {new Date(connectDevice.lastSeenAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Form Fields Section */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Terminal Settings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Device name *
                </span>
                <input
                  className={inputClass}
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  disabled={Boolean(syncingId)}
                  placeholder="e.g. Lagos HQ Main Entrance"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Serial number (SN) *
                </span>
                <input
                  className={cn(inputClass, "font-mono")}
                  value={sheetSn}
                  onChange={(e) => setSheetSn(e.target.value)}
                  disabled={Boolean(syncingId)}
                  placeholder="GED7251500360"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Area / Branch *
              </span>
              <select
                className={inputClass}
                value={sheetBranchId}
                onChange={(e) => setSheetBranchId(e.target.value)}
                disabled={Boolean(syncingId)}
              >
                <option value="">Select branch</option>
                {docs?.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} — {branch.location}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="block space-y-1.5 col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Device IP Address
                </span>
                <input
                  className={cn(inputClass, "font-mono")}
                  placeholder="102.88.54.109"
                  value={sheetIp}
                  onChange={(e) => setSheetIp(e.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={Boolean(syncingId)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Port
                </span>
                <input
                  className={cn(inputClass, "font-mono")}
                  placeholder={String(DEFAULT_ZK_PORT)}
                  value={sheetPort}
                  onChange={(e) => setSheetPort(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={Boolean(syncingId)}
                />
              </label>
            </div>
          </div>

          {/* Direct Local IP Connection Setup Box (Method 1 Only) */}
          <div className="rounded-2xl bg-slate-950 text-slate-100 p-5 border border-slate-800 space-y-3.5 shadow-xl">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-extrabold tracking-wider uppercase text-emerald-400">
                Direct Local IP Setup Guide (Port 4370)
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Connect your ZKTeco biometric machine directly over your office local network (Wi-Fi or Ethernet):
            </p>

            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 pl-1">
              <li>On your hardware device, go to <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">Menu → COMM. → Ethernet</code> (or <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">Wi-Fi</code>) to view its local IP address (e.g. <code>10.1.1.135</code>).</li>
              <li>Enter the IP address in the <strong>Device IP Address</strong> field above (default port is <code className="text-emerald-400 font-mono">4370</code>).</li>
              <li>Click <strong>Save & Connect</strong> or <strong>Sync logs</strong>. Smart HR connects to the terminal, pulls attendance logs, and sets the status to <strong>Online</strong>.</li>
            </ol>

            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Smart HR automatically polls this IP in the background for real-time punches.</span>
            </div>
          </div>

          {connectNote && (
            <p
              className={cn(
                "text-xs rounded-xl p-3 border font-medium",
                connectNote.toLowerCase().includes("fail") ||
                  connectNote.toLowerCase().includes("timed out") ||
                  connectNote.toLowerCase().includes("no reply") ||
                  connectNote.toLowerCase().includes("cannot reach") ||
                  connectNote.toLowerCase().includes("refused")
                  ? "text-amber-900 bg-amber-50 border-amber-200"
                  : "text-emerald-800 bg-emerald-50 border-emerald-200"
              )}
            >
              {connectNote}
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
          <Button
            variant="secondary"
            onClick={() => {
              connectAbortRef.current?.abort();
              setSyncingId(null);
              setConnectDevice(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void connectRealtime()}
            loading={Boolean(syncingId)}
            disabled={!connectDevice?.isActive || Boolean(syncingId)}
            className="rounded-xl px-5"
          >
            {syncingId ? "Checking device…" : "Save & Connect"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
