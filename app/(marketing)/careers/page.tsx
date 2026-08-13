import { prisma } from "@/lib/prisma";
import { getAppCurrencyCode } from "@/lib/currency";
import { CareersBoard } from "@/components/marketing/careers-board";
import { MarketingPageHeader } from "@/components/marketing/marketing-page";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Careers — Smart HR",
  description: "Browse open roles posted by HR and apply online in real time.",
};

export default async function CareersPage() {
  const [jobs, currencyCode, departments] = await Promise.all([
    prisma.job.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        title: true,
        location: true,
        office: true,
        type: true,
        quantity: true,
        salaryMin: true,
        salaryMax: true,
        description: true,
        postedAt: true,
        expectedClosingDate: true,
        department: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { postedAt: "desc" },
    }),
    getAppCurrencyCode(),
    prisma.department.findMany({
      where: {
        jobs: { some: { status: "OPEN" } },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(123,97,255,0.08)_0%,_transparent_55%),linear-gradient(to_bottom,#fafafa_0%,#ffffff_40%)]">
      <PageLiveRefresh types={["job_updated", "dashboard_updated"]} pollIntervalMs={5000} />
      <MarketingPageHeader
        title="Careers"
        description="Open roles posted by our HR team — apply online and track your path from application to hire."
        eyebrow="Company"
        align="center"
      />
      <CareersBoard jobs={jobs} departments={departments} currencyCode={currencyCode} />
    </div>
  );
}
