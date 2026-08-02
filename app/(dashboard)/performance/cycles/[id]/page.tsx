import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, statusBadge } from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { parseJsonArray } from "@/lib/performance/access";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/performance");

  const { id } = await params;
  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id },
    include: {
      kpis: { include: { kpi: true } },
      appraisals: {
        include: { employee: true, manager: true },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });
  if (!cycle) notFound();

  const deptIds = parseJsonArray(cycle.departmentIds);
  const roleFilters = parseJsonArray(cycle.roleFilters);

  return (
    <div>
      <Link href="/performance" className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to performance
      </Link>

      <PageHeader title={cycle.name} description={cycle.period} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center gap-2 mb-4">{statusBadge(cycle.status)}</div>
          {cycle.description && <p className="text-sm text-gray-700 mb-4">{cycle.description}</p>}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">Period</dt><dd className="font-medium">{formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}</dd></div>
            {cycle.selfReviewDeadline && <div><dt className="text-gray-500">Self review due</dt><dd className="font-medium">{formatDate(cycle.selfReviewDeadline)}</dd></div>}
            {cycle.managerReviewDeadline && <div><dt className="text-gray-500">Manager review due</dt><dd className="font-medium">{formatDate(cycle.managerReviewDeadline)}</dd></div>}
            <div><dt className="text-gray-500">Enrollment</dt><dd className="font-medium">{cycle.includeAllEmployees ? "All active employees" : "Filtered"}</dd></div>
          </dl>
          {!cycle.includeAllEmployees && (deptIds.length > 0 || roleFilters.length > 0) && (
            <p className="text-xs text-gray-500 mt-3">
              Conditions: {deptIds.length > 0 && `${deptIds.length} department(s)`}{" "}
              {roleFilters.length > 0 && `· Roles: ${roleFilters.join(", ")}`}
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">KPIs ({cycle.kpis.length})</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {cycle.kpis.map((link) => (
              <li key={link.id}>• {link.kpi.title}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          People involved ({cycle.appraisals.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Appraisee</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Manager</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cycle.appraisals.map((appraisal) => (
                <tr key={appraisal.id}>
                  <td className="px-3 py-3 font-medium">
                    {fullName(appraisal.employee.firstName, appraisal.employee.lastName)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {fullName(appraisal.manager.firstName, appraisal.manager.lastName)}
                  </td>
                  <td className="px-3 py-3">{statusBadge(appraisal.status)}</td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/performance/appraisals/${appraisal.id}`} className="text-violet-600 hover:text-violet-700 text-xs font-medium">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
