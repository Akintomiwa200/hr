import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canEditManagerAppraisal,
  canEditSelfAppraisal,
  canViewAppraisal,
} from "@/lib/performance/access";
import { AppraisalDetailModule } from "@/components/performance/appraisal-detail-module";

export default async function AppraisalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const appraisal = await prisma.performanceAppraisal.findUnique({
    where: { id },
    include: {
      cycle: true,
      employee: { include: { department: true } },
      manager: true,
      kpiScores: { include: { kpi: true } },
    },
  });
  if (!appraisal) notFound();

  const allowed = await canViewAppraisal(session, appraisal);
  if (!allowed) redirect("/performance");

  return (
    <AppraisalDetailModule
      appraisal={appraisal}
      canEditSelf={canEditSelfAppraisal(session, appraisal)}
      canEditManager={canEditManagerAppraisal(session, appraisal)}
    />
  );
}
