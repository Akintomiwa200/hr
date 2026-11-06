import Link from "next/link";
import { Building2, FileText, ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  platformStatusClass,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformPrivacyPage() {
  await requirePlatformAdmin();

  const [companies, documentCounts] = await Promise.all([
    prisma.company.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.document.groupBy({
      by: ["companyId"],
      _count: { _all: true },
    }),
  ]);

  const documentsByCompany = new Map(
    documentCounts
      .filter((entry) => entry.companyId)
      .map((entry) => [entry.companyId as string, entry._count._all])
  );
  const totalUsers = companies.reduce(
    (sum, company) => sum + company._count.users,
    0
  );
  const totalDocuments = [...documentsByCompany.values()].reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={[
          "employee_updated",
          "document_updated",
          "dashboard_updated",
          "settings_updated",
        ]}
      />
      <PageHeader
        title="Compliance & data privacy"
        description="Tenant data footprint and privacy workflow coverage."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenants" value={companies.length} icon={Building2} />
        <StatCard label="User profiles" value={totalUsers} icon={Users} />
        <StatCard label="Stored documents" value={totalDocuments} icon={FileText} />
        <StatCard label="Retention workflows" value={0} icon={ShieldCheck} />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900">
        Deletion requests and retention schedules do not have workflow records in
        the current data model. This page reports the tenant data scope only.
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Tenant data scope
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Personal data held per company, refreshed as records change.
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">Company</th>
                <th className="px-5 py-3 font-semibold">User profiles</th>
                <th className="px-5 py-3 font-semibold">Documents</th>
                <th className="px-5 py-3 font-semibold">Data scope</th>
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
                    <p className="text-[11px] text-gray-500">{company.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-700">
                    {company._count.users}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-700">
                    {documentsByCompany.get(company.id) ?? 0}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    Employee, payroll, attendance, documents
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        company.isActive ? "ACTIVE" : "INACTIVE"
                      )}`}
                    >
                      {company.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    No tenant data exists yet.
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
