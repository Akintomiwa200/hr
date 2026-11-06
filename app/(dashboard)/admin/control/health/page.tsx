import { Activity, Cpu, Database, Server, Timer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { HealthLiveRefresh } from "@/components/admin/health-live-refresh";
import {
  formatPlatformDateTime,
  platformStatusClass,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformHealthPage() {
  await requirePlatformAdmin();

  let connected = false;
  let queryError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    connected = true;
  } catch (error) {
    connected = false;
    queryError = error instanceof Error ? error.message : "Database query failed";
  }

  const memory = process.memoryUsage();
  const uptimeMinutes = Math.floor(process.uptime() / 60);
  const uptimeLabel =
    uptimeMinutes >= 60
      ? `${Math.floor(uptimeMinutes / 60)}h ${uptimeMinutes % 60}m`
      : `${uptimeMinutes}m`;

  const rows = [
    {
      title: "Application process",
      detail: `Node ${process.version} · ${process.platform} ${process.arch}`,
      status: "READY",
    },
    {
      title: "Database query",
      detail: connected
        ? "SELECT 1 completed successfully on the configured Prisma database."
        : queryError ?? "Database query failed.",
      status: connected ? "READY" : "ERROR",
    },
    {
      title: "Runtime memory",
      detail: `${Math.round(memory.rss / 1_048_576)} MB resident · ${Math.round(
        memory.heapUsed / 1_048_576
      )} MB heap used`,
      status: "READY",
    },
    {
      title: "Process uptime",
      detail: `Running for ${uptimeLabel}. This panel refreshes every 30 seconds and on platform events.`,
      status: "READY",
    },
    {
      title: "Environment",
      detail: `NODE_ENV=${process.env.NODE_ENV ?? "development"} · ${
        process.env.VERCEL ? "Vercel runtime" : "Self-managed runtime"
      }`,
      status: "READY",
    },
  ];

  return (
    <div className="w-full space-y-5">
      <HealthLiveRefresh />
      <PageHeader
        title="System health & uptime"
        description="Live application process, database connectivity, and runtime signals."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Application" value="Online" icon={Server} />
        <StatCard
          label="Database"
          value={connected ? "Connected" : "Error"}
          icon={Database}
        />
        <StatCard label="Uptime" value={uptimeLabel} icon={Timer} />
        <StatCard
          label="Memory"
          value={`${Math.round(memory.rss / 1_048_576)} MB`}
          icon={Cpu}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Runtime checks
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Captured {formatPlatformDateTime(new Date())} · refreshed automatically.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <Activity className="h-3 w-3" />
            LIVE
          </span>
        </div>

        <div className="divide-y divide-gray-50">
          {rows.map((row) => (
            <div
              key={row.title}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50/60"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-gray-900">{row.title}</p>
                <p className="mt-1 break-words text-xs text-gray-500">{row.detail}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                  row.status
                )}`}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
