import { isApplicationActivityReady, isRecruitmentModelsReady, prisma } from "@/lib/prisma";
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_PIPELINE_STAGES,
  STAGE_TO_STATUS,
} from "@/lib/recruitment/constants";
import { onboardHiredCandidate } from "@/lib/recruitment/provision-staff";

export async function logApplicationActivity(input: {
  applicationId: string;
  type: string;
  title: string;
  message?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isApplicationActivityReady()) return null;

  return prisma.applicationActivity.create({
    data: {
      applicationId: input.applicationId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      actorName: input.actorName ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function moveApplicationStage(input: {
  applicationId: string;
  pipelineStage: string;
  actorName?: string;
  reason?: string;
}) {
  const status = STAGE_TO_STATUS[input.pipelineStage] ?? "APPLIED";
  const existing = await prisma.jobApplication.findUnique({ where: { id: input.applicationId } });
  if (!existing) return null;

  const fromStage = existing.pipelineStage ?? STATUS_TO_FALLBACK_STAGE(existing.status);

  const updated = await prisma.jobApplication.update({
    where: { id: input.applicationId },
    data: { pipelineStage: input.pipelineStage, status },
  });

  await logApplicationActivity({
    applicationId: input.applicationId,
    type: "stage_change",
    title: "Stage updated",
    message: reasonMessage(fromStage, input.pipelineStage, input.reason),
    actorName: input.actorName,
    metadata: { from: fromStage, to: input.pipelineStage, reason: input.reason },
  });

  if (status === "HIRED" && existing.status !== "HIRED") {
    await onboardHiredCandidate(input.applicationId, input.actorName);
  }

  return updated;
}

function STATUS_TO_FALLBACK_STAGE(status: string) {
  const map: Record<string, string> = {
    APPLIED: "Applied",
    SCREENING: "Screening",
    INTERVIEW: "1st Interview",
    OFFER: "Offered",
    HIRED: "Hired",
    REJECTED: "Rejected",
  };
  return map[status] ?? "Applied";
}

function reasonMessage(from: string, to: string, reason?: string) {
  const base = `Moved from ${from} to ${to}`;
  return reason ? `${base}. Reason: ${reason}` : base;
}

export async function ensureRecruitmentDefaults(companyId: string | null | undefined) {
  if (!companyId || !isRecruitmentModelsReady()) return;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) return;

  const stageCount = await prisma.recruitmentStage.count({ where: { companyId } });
  if (stageCount === 0) {
    await prisma.recruitmentStage.createMany({
      data: DEFAULT_PIPELINE_STAGES.map((name, index) => ({
        companyId,
        name,
        sortOrder: index,
        color: ["blue", "amber", "violet", "purple", "teal", "green", "red"][index] ?? "gray",
      })),
    });
  }

  const tagCount = await prisma.recruitmentTag.count({ where: { companyId } });
  if (tagCount === 0) {
    await prisma.recruitmentTag.createMany({
      data: [
        { companyId, name: "Design", color: "violet" },
        { companyId, name: "Engineer", color: "blue" },
        { companyId, name: "Finance", color: "green" },
        { companyId, name: "Product", color: "amber" },
      ],
    });
  }

  const sourceCount = await prisma.recruitmentSource.count({ where: { companyId } });
  if (sourceCount === 0) {
    await prisma.recruitmentSource.createMany({
      data: [
        { companyId, name: "LinkedIn" },
        { companyId, name: "Referral" },
        { companyId, name: "Company Website" },
        { companyId, name: "Job Board" },
      ],
    });
  }

  const templateCount = await prisma.recruitmentEmailTemplate.count({ where: { companyId } });
  if (templateCount === 0) {
    await prisma.recruitmentEmailTemplate.createMany({
      data: DEFAULT_EMAIL_TEMPLATES.map((t) => ({
        companyId,
        name: t.name,
        subject: t.subject,
        body: t.body,
        stage: t.stage,
      })),
    });
  }
}

export async function getCompanyPipelineStages(companyId: string | null | undefined) {
  if (!companyId || !isRecruitmentModelsReady()) return [...DEFAULT_PIPELINE_STAGES];

  await ensureRecruitmentDefaults(companyId);
  const stages = await prisma.recruitmentStage.findMany({
    where: { companyId },
    orderBy: { sortOrder: "asc" },
  });
  return stages.length > 0 ? stages.map((s) => s.name) : [...DEFAULT_PIPELINE_STAGES];
}
