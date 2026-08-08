import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRecruitment } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { RecruitmentTabs } from "@/components/recruitment/recruitment-tabs";
import { JobDetailModule } from "@/components/recruitment/job-detail-module";
import { getRecruitmentContextForSession } from "@/lib/recruitment/data";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const { id } = await params;
  const [job, ctx] = await Promise.all([
    prisma.job.findUnique({
      where: { id },
      include: {
        department: true,
        applications: {
          include: { tag: true, job: { select: { id: true, title: true } } },
          orderBy: { appliedAt: "desc" },
        },
      },
    }),
    getRecruitmentContextForSession(session),
  ]);

  if (!job) notFound();

  return (
    <div>
      <RecruitmentTabs />
      <JobDetailModule
        job={job}
        stages={ctx.stageNames}
        sources={ctx.sources}
        tags={ctx.tags}
        emailTemplates={ctx.templates}
        canManage={canManageRecruitment(session.role)}
      />
    </div>
  );
}
