import { Activity, CheckCircle2, Plug2, RefreshCw, Server } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  formatPlatformDateTime,
  platformStatusClass,
  platformStatusLabel,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformIntegrationsPage() {
  await requirePlatformAdmin();

  const integrations = await prisma.integration.findMany({
    where: { companyId: null },
    include: {
      syncLogs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { provider: "asc" },
  });

  const integrationIds = integrations.map((integration) => integration.id);
  const syncLogs = integrationIds.length
    ? await prisma.integrationSyncLog.findMany({
        where: { integrationId: { in: integrationIds } },
        include: { integration: { select: { provider: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  const connected = integrations.filter(
    (integration) => integration.status === "CONNECTED"
  ).length;
  const errors = integrations.filter(
    (integration) => integration.status === "ERROR"
  ).length;

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={[
          "integration_updated",
          "integration_sync",
          "integration_webhook",
          "dashboard_updated",
        ]}
      />
      <PageHeader
        title="API & integrations gateway"
        description="Global provider connections and their latest synchronisation activity."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Global connections" value={integrations.length} icon={Plug2} />
        <StatCard label="Connected" value={connected} icon={CheckCircle2} />
        <StatCard label="Errors" value={errors} icon={Activity} />
        <StatCard label="Recent sync events" value={syncLogs.length} icon={RefreshCw} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Provider connections
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Credentials stay in the deployment secret store; this page never
              reveals secret values.
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">Provider</th>
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Last sync</th>
                <th className="px-5 py-3 font-semibold">Last error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {integrations.map((integration) => (
                <tr key={integration.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <p className="text-[12.5px] font-medium capitalize text-gray-900">
                      {integration.provider.replaceAll("_", " ").toLowerCase()}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {integration.scopes ?? "Global platform connection"}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {integration.accountEmail ??
                      integration.accountId ?? (
                        <span className="text-gray-400">No linked account</span>
                      )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        integration.status
                      )}`}
                    >
                      {platformStatusLabel(integration.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                    {integration.lastSyncAt
                      ? formatPlatformDateTime(integration.lastSyncAt)
                      : "Never"}
                  </td>
                  <td className="max-w-[240px] truncate px-5 py-3 text-[12px] text-gray-500">
                    {integration.lastError ?? "—"}
                  </td>
                </tr>
              ))}
              {integrations.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    <Server className="mx-auto mb-3 h-6 w-6 text-gray-300" />
                    No global integrations are connected yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-gray-900">
            Recent synchronisation log
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Latest 50 sync events for global connections.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Provider</th>
                <th className="px-5 py-3 font-semibold">Direction</th>
                <th className="px-5 py-3 font-semibold">Event</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {syncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/60">
                  <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                    {formatPlatformDateTime(log.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] capitalize text-gray-700">
                    {log.integration.provider.replaceAll("_", " ").toLowerCase()}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {log.direction}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-700">
                    {log.eventType}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        log.status
                      )}`}
                    >
                      {platformStatusLabel(log.status)}
                    </span>
                  </td>
                  <td className="max-w-[260px] truncate px-5 py-3 text-[12px] text-gray-500">
                    {log.summary ?? "—"}
                  </td>
                </tr>
              ))}
              {syncLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-gray-500"
                  >
                    No synchronisation events have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
