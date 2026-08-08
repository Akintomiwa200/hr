"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ExternalLink,
  Link2,
  Mail,
  RefreshCw,
  Unlink,
  Users,
  Briefcase,
  FileSignature,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
} from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";

type IntegrationItem = {
  provider: string;
  slug: string;
  name: string;
  vendor: "Google" | "Zoho";
  description: string;
  modules: string[];
  webhookPath?: string;
  docsUrl: string;
  configured: boolean;
  status: string;
  connected: boolean;
  accountEmail: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  connectedAt: string | null;
  webhookSecret: string | null;
};

type SyncLog = {
  id: string;
  provider: string;
  direction: string;
  eventType: string;
  summary: string | null;
  status: string;
  createdAt: string;
};

const VENDOR_ICONS: Record<string, typeof Calendar> = {
  GOOGLE_WORKSPACE: Calendar,
  ZOHO_PEOPLE: Users,
  ZOHO_RECRUIT: Briefcase,
  ZOHO_BOOKS: BookOpen,
  ZOHO_SIGN: FileSignature,
  ZOHO_MAIL: Mail,
};

function statusBadge(item: IntegrationItem) {
  if (!item.configured) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
        Not configured
      </span>
    );
  }
  if (item.status === "SYNCING") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
        <Loader2 className="w-3 h-3 animate-spin" />
        Syncing
      </span>
    );
  }
  if (item.status === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        <AlertCircle className="w-3 h-3" />
        Error
      </span>
    );
  }
  if (item.connected) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      Disconnected
    </span>
  );
}

function formatWhen(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function IntegrationsHub() {
  const router = useRouter();
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/integrations", { cache: "no-store" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to load integrations"));
      return;
    }
    const data = (await res.json()) as { items: IntegrationItem[]; logs: SyncLog[] };
    setItems(data.items);
    setLogs(data.logs);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    let source: EventSource | null = null;
    try {
      source = new EventSource("/api/events");
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string; data?: Record<string, unknown> };
          if (
            payload.type === "integration_sync" ||
            payload.type === "integration_webhook" ||
            payload.type === "employee_updated" ||
            payload.type === "leave_updated" ||
            payload.type === "job_updated" ||
            payload.type === "payroll_updated"
          ) {
            const provider = String(payload.data?.provider ?? payload.type);
            setLiveStatus(`Live update: ${provider.replace(/_/g, " ")}`);
            void load();
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // SSE unavailable
    }
    return () => source?.close();
  }, [load]);

  const connect = (slug: string) => {
    window.location.href = `/api/integrations/${slug}/connect`;
  };

  const disconnect = async (slug: string) => {
    setBusySlug(slug);
    const res = await fetch(`/api/integrations/${slug}`, { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to disconnect"));
    } else {
      notify.success("Integration disconnected");
      await load();
    }
    setBusySlug(null);
  };

  const syncOne = async (slug: string) => {
    setBusySlug(slug);
    const res = await fetch(`/api/integrations/${slug}/sync`, { method: "POST" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Sync failed"));
    } else {
      const data = (await res.json()) as { summary?: string };
      notify.success(data.summary ?? "Sync complete");
      await load();
    }
    setBusySlug(null);
  };

  const syncAll = async () => {
    setBusySlug("all");
    const res = await fetch("/api/integrations/sync-all", { method: "POST" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Sync all failed"));
    } else {
      notify.success("All connected integrations synced");
      await load();
    }
    setBusySlug(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading integrations…
      </div>
    );
  }

  const connectedCount = items.filter((item) => item.connected).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Office integrations"
          description="Connect Google Workspace and Zoho apps for real-time two-way sync via webhooks and live SSE updates."
          action={
            <div className="flex items-center gap-2">
              {liveStatus && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <Radio className="w-3 h-3" />
                  {liveStatus}
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void syncAll()}
                disabled={busySlug === "all" || connectedCount === 0}
              >
                {busySlug === "all" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync all ({connectedCount})
              </Button>
            </div>
          }
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = VENDOR_ICONS[item.provider] ?? Link2;
          const busy = busySlug === item.slug;
          const appUrl =
            typeof window !== "undefined"
              ? window.location.origin
              : process.env.NEXT_PUBLIC_APP_URL ?? "";

          return (
            <Card key={item.provider} className="flex flex-col">
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <span className="text-[10px] uppercase tracking-wide font-bold text-gray-400">
                          {item.vendor}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    </div>
                  </div>
                  {statusBadge(item)}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {item.modules.map((mod) => (
                    <span
                      key={mod}
                      className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md"
                    >
                      {mod}
                    </span>
                  ))}
                </div>

                {item.connected && item.accountEmail && (
                  <p className="text-xs text-emerald-700">
                    Connected as {item.accountEmail} · Last sync {formatWhen(item.lastSyncAt)}
                  </p>
                )}
                {item.lastError && (
                  <p className="text-xs text-amber-700">Last sync failed. Use Sync now to retry.</p>
                )}
                {item.webhookPath && item.webhookSecret && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="font-medium text-gray-700">Webhook URL (real-time)</p>
                    <code className="block break-all text-[11px]">
                      {appUrl}
                      {item.webhookPath}
                    </code>
                    <p className="text-[10px] text-gray-400">
                      Secret: {item.webhookSecret.slice(0, 8)}…
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  {!item.configured ? (
                    <p className="text-xs text-gray-500">
                      Add OAuth credentials to <code className="text-[11px]">.env</code> to enable.
                    </p>
                  ) : item.connected ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void syncOne(item.slug)}
                        disabled={busy}
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync now
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void disconnect(item.slug)}
                        disabled={busy}
                      >
                        <Unlink className="w-4 h-4" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => connect(item.slug)} disabled={busy}>
                      <Link2 className="w-4 h-4" />
                      Connect
                    </Button>
                  )}
                  <a
                    href={item.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 px--2 py-1.5"
                  >
                    API docs
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Live activity feed" description="Recent sync and webhook events" />
        <div className="px-5 pb-5">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No sync activity yet. Connect an integration to start.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {logs.map((log) => (
                <li key={log.id} className="py-3 flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      {log.provider.replace(/_/g, " ")} · {log.eventType}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{log.summary}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatWhen(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <p className="text-xs text-gray-500">
        Need help? See{" "}
        <Link href="/docs#integrations" className="text-violet-600 hover:underline">
          integration API docs
        </Link>
        , the{" "}
        <Link href="/help/settings" className="text-violet-600 hover:underline">
          settings guide
        </Link>
        , or configure OAuth apps in Google Cloud Console and Zoho API Console.
      </p>
    </div>
  );
}
