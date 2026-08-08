import type { SessionUser } from "@/lib/auth";
import { isRecruitmentModelsReady, prisma } from "@/lib/prisma";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/recruitment/constants";
import { ensureRecruitmentDefaults, getCompanyPipelineStages } from "@/lib/recruitment/activity";

/** Session JWT can keep an old companyId after db:seed — resolve against live DB. */
export async function resolveRecruitmentCompanyId(
  userId: string,
  sessionCompanyId?: string | null
): Promise<string | null> {
  if (sessionCompanyId) {
    const company = await prisma.company.findUnique({
      where: { id: sessionCompanyId },
      select: { id: true },
    });
    if (company) return company.id;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  if (!user?.companyId) return null;

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { id: true },
  });
  return company?.id ?? null;
}

export async function getRecruitmentContext(companyId: string | null | undefined) {
  const recruitmentReady = isRecruitmentModelsReady();

  if (companyId && recruitmentReady) {
    await ensureRecruitmentDefaults(companyId);
  }

  const [stages, tags, sources, templates, employees] = await Promise.all([
    companyId && recruitmentReady
      ? prisma.recruitmentStage.findMany({ where: { companyId }, orderBy: { sortOrder: "asc" } })
      : Promise.resolve([]),
    companyId && recruitmentReady
      ? prisma.recruitmentTag.findMany({
          where: { companyId },
          orderBy: { name: "asc" },
          include: { _count: { select: { applications: true } } },
        })
      : Promise.resolve([]),
    companyId && recruitmentReady
      ? prisma.recruitmentSource.findMany({ where: { companyId }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    companyId && recruitmentReady
      ? prisma.recruitmentEmailTemplate.findMany({ where: { companyId }, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    prisma.employee.findMany({
      where: companyId ? { user: { companyId } } : {},
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const stageNames = recruitmentReady
    ? await getCompanyPipelineStages(companyId)
    : [...DEFAULT_PIPELINE_STAGES];

  return { stages, stageNames, tags, sources, templates, employees, recruitmentReady };
}

export async function getRecruitmentContextForSession(session: SessionUser) {
  const companyId = await resolveRecruitmentCompanyId(session.id, session.companyId);
  return getRecruitmentContext(companyId);
}
