import { Clock3, Database, HardDriveDownload, ShieldCheck } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  platformStatusClass,
  platformStatusLabel,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformBackupsPage() {
  await requirePlatformAdmin();

  const providerConfigured = Boolean(
    process.env.BACKUP_STATUS_URL ||
      process.env.DATABASE_BACKUP_BUCKET ||
      process.env.BACKUP_PROVIDER
  );
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  const retentionDays = process.env.BACKUP_RETENTION_DAYS ?? null;

  const rows = [
    {
      title: "Backup provider",
      detail: providerConfigured
        ? "A backup configuration signal is present in the deployment environment."
        : "No backup provider status is connected to this application.",
      status: providerConfigured ? "CONFIGURED" : "NOT CONFIGURED",
    },
    {
      title: "Database connection",
      detail: databaseConfigured
        ? "A database connection string is configured for the runtime."
        : "No database connection string is configured.",
      status: databaseConfigured ? "CONFIGURED" : "NOT CONFIGURED",
    },
    {
      title: "Point-in-time recovery",
      detail:
        "Recovery point status is managed by the database provider and is not queried from this application.",
      status: "PROVIDER MANAGED",
    },
    {
      title: "Retention window",
      detail: retentionDays
        ? `The deployment reports a ${retentionDays}-day retention window.`
        : "No retention window is reported by the deployment environment.",
      status: retentionDays ? "CONFIGURED" : "NOT REPORTED",
    },
  ];

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh types={["settings_updated", "dashboard_updated", "audit_updated"]} />
      <PageHeader
        title="Backups & disaster recovery"
        description="Backup signals and recovery readiness from this deployment."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Backup integration"
          value={providerConfigured ? "Configured" : "Unavailable"}
          icon={HardDriveDownload}
        />
        <StatCard
          label="Database link"
          value={databaseConfigured ? "Configured" : "Missing"}
          icon={Database}
        />
        <StatCard
          label="Last snapshot"
          value={process.env.BACKUP_LAST_SNAPSHOT ?? "Not reported"}
          icon={Clock3}
        />
        <StatCard
          label="Recovery test"
          value={process.env.BACKUP_LAST_RESTORE_TEST ?? "Not reported"}
          icon={ShieldCheck}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-gray-900">
            Recovery readiness
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Environment-backed signals only. Values update when settings change.
          </p>
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
                {platformStatusLabel(row.status)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900">
        No manual backup action is offered because the database provider API is
        not configured in this application. Use your hosting provider to run and
        verify snapshots.
      </div>
    </div>
  );
}
