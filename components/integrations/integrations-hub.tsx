"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { useAppEvents } from "@/hooks/use-app-events";

type IntegrationItem = {
  provider: string;
  slug: string;
  name: string;
  vendor: string;
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
  MICROSOFT_365: Users,
  BAMBOOHR: Users,
  QUICKBOOKS: BookOpen,
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
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [googleRedirectUri, setGoogleRedirectUri] = useState<string | null>(null);
  const [zohoRedirectUri, setZohoRedirectUri] = useState<string | null>(null);
  const [microsoftRedirectUri, setMicrosoftRedirectUri] = useState<string | null>(null);
  const [quickBooksRedirectUri, setQuickBooksRedirectUri] = useState<string | null>(null);
  const [bambooDomain, setBambooDomain] = useState("");
  const [bambooKey, setBambooKey] = useState("");
  const [customName, setCustomName] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customSecret, setCustomSecret] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/integrations", { cache: "no-store" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to load integrations"));
      return;
    }
    const data = (await res.json()) as {
      items: IntegrationItem[];
      logs: SyncLog[];
      googleRedirectUri?: string;
      zohoRedirectUri?: string;
      microsoftRedirectUri?: string;
      quickBooksRedirectUri?: string;
    };
    setItems(data.items);
    setLogs(data.logs);
    setGoogleRedirectUri(data.googleRedirectUri ?? null);
    setZohoRedirectUri(data.zohoRedirectUri ?? null);
    setMicrosoftRedirectUri(data.microsoftRedirectUri ?? null);
    setQuickBooksRedirectUri(data.quickBooksRedirectUri ?? null);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load().finally(() => setLoading(false)));
  }, [load]);

  useAppEvents({
    types: [
      "integration_sync",
      "integration_webhook",
      "employee_updated",
      "leave_updated",
      "job_updated",
      "payroll_updated",
    ],
    onEvent: (type, data) => {
      const provider = String(data?.provider ?? type ?? "integration");
      setLiveStatus(`Live update: ${provider.replace(/_/g, " ")}`);
      void load();
    },
  });

  const connect = (slug: string) => {
    window.location.assign(`/api/integrations/${slug}/connect`);
  };

  const connectBambooHr = async () => {
    setBusySlug("bamboohr");
    const res = await fetch("/api/integrations/bamboohr/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyDomain: bambooDomain, apiKey: bambooKey }),
    });
    if (!res.ok) notify.error(await readApiError(res, "Could not connect BambooHR"));
    else {
      notify.success("BambooHR connected and employee sync completed");
      setBambooKey("");
      await load();
    }
    setBusySlug(null);
  };

  const connectCustomWebhook = async () => {
    setBusySlug("custom-webhook");
    const res = await fetch("/api/integrations/custom-webhook/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: customName, endpointUrl: customEndpoint, secret: customSecret }),
    });
    if (!res.ok) notify.error(await readApiError(res, "Could not connect the custom webhook"));
    else {
      notify.success("Custom webhook connected and test event delivered");
      setCustomSecret("");
      await load();
    }
    setBusySlug(null);
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
          description="Connect Google Workspace, Microsoft 365, BambooHR, QuickBooks Online, and Zoho. Sync status and events update live."
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

      {(googleRedirectUri || zohoRedirectUri || microsoftRedirectUri || quickBooksRedirectUri) && (
        <Card className="p-4 bg-gray-50 border-dashed">
          <p className="text-sm font-medium text-gray-900">OAuth redirect URIs</p>
          <p className="text-xs text-gray-500 mt-1">
            Register each callback URL in its provider&apos;s developer console. Configure the OAuth
            client credentials in the server environment before connecting. Smart HR uses its
            dedicated integration callback endpoints.
          </p>
          <dl className="mt-3 space-y-2 text-xs">
            {googleRedirectUri && (
              <div>
                <dt className="font-medium text-gray-700">Google</dt>
                <dd className="font-mono text-gray-600 break-all">{googleRedirectUri}</dd>
              </div>
            )}
            {zohoRedirectUri && (
              <div>
                <dt className="font-medium text-gray-700">Zoho</dt>
                <dd className="font-mono text-gray-600 break-all">{zohoRedirectUri}</dd>
              </div>
            )}
            {microsoftRedirectUri && (
              <div><dt className="font-medium text-gray-700">Microsoft Entra</dt><dd className="font-mono text-gray-600 break-all">{microsoftRedirectUri}</dd></div>
            )}
            {quickBooksRedirectUri && (
              <div><dt className="font-medium text-gray-700">Intuit / QuickBooks</dt><dd className="font-mono text-gray-600 break-all">{quickBooksRedirectUri}</dd></div>
            )}
          </dl>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = VENDOR_ICONS[item.provider] ?? Link2;
          const busy = busySlug === item.slug;

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
                {item.connected && item.webhookPath && (
                  <p className="text-[11px] text-gray-500">Webhook endpoint: <code>{item.webhookPath}</code></p>
                )}
                {item.lastError && (
                  <p className="text-xs text-amber-700">
                    Last sync failed. Use Sync now to retry
                    {item.lastError.length < 320 ? ` — ${item.lastError}` : "."}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  {!item.configured ? (
                    <p className="text-xs text-gray-500">
                      {item.provider === "QUICKBOOKS"
                        ? "Set INTUIT_CLIENT_ID, INTUIT_CLIENT_SECRET, and INTUIT_WEBHOOK_VERIFIER_TOKEN to enable."
                        : item.provider === "MICROSOFT_365"
                          ? "Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to enable."
                          : "Add provider credentials to the server environment to enable."}
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
                  ) : item.provider === "BAMBOOHR" ? (
                    <div className="grid w-full gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                      <input value={bambooDomain} onChange={(event) => setBambooDomain(event.target.value)} placeholder="Company subdomain" aria-label="BambooHR company subdomain" className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                      <input value={bambooKey} onChange={(event) => setBambooKey(event.target.value)} placeholder="API key" aria-label="BambooHR API key" type="password" autoComplete="off" className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                      <Button size="sm" onClick={() => void connectBambooHr()} disabled={busy || !bambooDomain || !bambooKey}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                        Connect
                      </Button>
                    </div>
                  ) : item.provider === "CUSTOM_WEBHOOK" ? (
                    <div className="grid w-full gap-2 sm:grid-cols-2">
                      <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Platform name" aria-label="Custom platform name" className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                      <input value={customEndpoint} onChange={(event) => setCustomEndpoint(event.target.value)} placeholder="https://your-platform.example/webhook" aria-label="Custom webhook endpoint" type="url" className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                      <input value={customSecret} onChange={(event) => setCustomSecret(event.target.value)} placeholder="Signing secret (24+ characters)" aria-label="Custom webhook signing secret" type="password" autoComplete="new-password" className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                      <Button size="sm" onClick={() => void connectCustomWebhook()} disabled={busy || !customName || !customEndpoint || customSecret.length < 24}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                        Connect & test
                      </Button>
                      <p className="text-[11px] text-gray-500 sm:col-span-2">Sends company-scoped event names as JSON. Verify X-SmartHR-Signature as HMAC-SHA256 of timestamp + a dot + raw body using your signing secret.</p>
                    </div>
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
