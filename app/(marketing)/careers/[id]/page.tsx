import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAppCurrencyCode } from "@/lib/currency";
import { CareersJobDetail } from "@/components/marketing/careers-job-detail";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, status: "OPEN" },
    select: { title: true, description: true },
  });
  if (!job) return { title: "Role not found — Smart HR" };
  return {
    title: `${job.title} — Careers — Smart HR`,
    description: job.description.slice(0, 160),
  };
}

export default async function CareersJobPage({ params }: Props) {
  const { id } = await params;
  const [job, currencyCode] = await Promise.all([
    prisma.job.findFirst({
      where: { id, status: "OPEN" },
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
        requirements: true,
        responsibilities: true,
        benefits: true,
        postedAt: true,
        expectedClosingDate: true,
        department: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, slug: true } },
      },
    }),
    getAppCurrencyCode(),
  ]);

  if (!job) notFound();

  return (
    <>
      <PageLiveRefresh types={["job_updated"]} pollIntervalMs={6000} />
      <CareersJobDetail job={job} currencyCode={currencyCode} />
    </>
  );
}
