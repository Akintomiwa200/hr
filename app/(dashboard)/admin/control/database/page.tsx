import Link from "next/link";
import { Building2, Database, FileText, HardDrive, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { planLabel } from "@/lib/subscription-plans";
import {
  formatPlatformDate,
  platformStatusClass,
  platformStatusLabel,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformDatabasePage() {
  await requirePlatformAdmin();

  const [companies, employeeCount, documentCount] = await Promise.all([
    prisma.company.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.employee.count(),
    prisma.document.count(),
  ]);

  const totalUsers = companies.reduce(
    (sum, company) => sum + company._count.users,
    0
  );
  const provider = process.env.DATABASE_URL?.startsWith("postgres")
    ? "PostgreSQL"
    : "Configured Prisma database";

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["dashboard_updated", "employee_updated", "document_updated"]}
      />
      <PageHeader
        title="Database & tenant capacity"
        description="Tenant distribution in the shared platform database."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenants" value={companies.length} icon={Building2} />
        <StatCard label="User profiles" value={totalUsers} icon={Users} />
        <StatCard label="Employee records" value={employeeCount} icon={HardDrive} />
        <StatCard label="Stored documents" value={documentCount} icon={FileText} />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900">
        Tenant data currently shares the configured {provider} database. Per-tenant
        partitions and cluster-level capacity metrics are not represented in this
        deployment.
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Tenant data footprint
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Account distribution across the shared database.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <Database className="h-3 w-3" />
            CONNECTED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">Company</th>
                <th className="px-5 py-3 font-semibold">Slug</th>
                <th className="px-5 py-3 font-semibold">User profiles</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="text-[12.5px] font-medium text-gray-900 hover:text-violet-700"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-[11.5px] text-gray-500">
                    {company.slug}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] font-medium text-gray-900">
                    {company._count.users}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-700">
                    {planLabel(company.plan)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                    {formatPlatformDate(company.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        company.isLocked
                          ? "LOCKED"
                          : company.isActive
                            ? "ACTIVE"
                            : "INACTIVE"
                      )}`}
                    >
                      {company.isLocked
                        ? "LOCKED"
                        : company.isActive
                          ? "ACTIVE"
                          : platformStatusLabel("INACTIVE")}
                    </span>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    No tenant data exists in the database yet.
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
