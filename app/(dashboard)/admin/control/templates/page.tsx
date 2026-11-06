import { BookOpen, CheckCircle2, Clock3, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  formatPlatformDateTime,
  platformStatusClass,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformTemplatesPage() {
  await requirePlatformAdmin();

  const templates = await prisma.portalTemplate.findMany({
    where: { companyId: null },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const published = templates.filter((template) => template.isPublished).length;
  const categories = new Set(templates.map((template) => template.category)).size;
  const kinds = new Set(templates.map((template) => template.kind)).size;

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={[
          "letter_updated",
          "document_updated",
          "settings_updated",
          "dashboard_updated",
        ]}
      />
      <PageHeader
        title="Data seeders & templates"
        description="Global HR letter and form templates available to every tenant."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Global templates" value={templates.length} icon={BookOpen} />
        <StatCard label="Published" value={published} icon={CheckCircle2} />
        <StatCard label="Categories" value={categories} icon={Layers} />
        <StatCard label="Template kinds" value={kinds} icon={Clock3} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Global template library
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {templates.length
                ? `${templates.length} templates · refreshed when letters or documents change`
                : "No global templates have been created yet."}
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">Template</th>
                <th className="px-5 py-3 font-semibold">Kind</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3 font-semibold">Created by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <p className="text-[12.5px] font-medium text-gray-900">
                      {template.title}
                    </p>
                    {template.description && (
                      <p className="max-w-[280px] truncate text-[11px] text-gray-500">
                        {template.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] capitalize text-gray-700">
                    {template.kind}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {template.category}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        template.isPublished ? "PUBLISHED" : "DRAFT"
                      )}`}
                    >
                      {template.isPublished ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                    {formatPlatformDateTime(template.updatedAt)}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {template.createdByName}
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    <BookOpen className="mx-auto mb-3 h-6 w-6 text-gray-300" />
                    No global templates are available yet.
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
