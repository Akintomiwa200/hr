import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  canEditManagerAppraisal,
  canEditSelfAppraisal,
  canViewAppraisal,
  computeOverallRating,
} from "@/lib/performance/access";
import { forbidden, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const appraisal = await prisma.performanceAppraisal.findUnique({
    where: { id },
    include: {
      cycle: { include: { kpis: { include: { kpi: true } } } },
      employee: { include: { department: true } },
      manager: true,
      kpiScores: { include: { kpi: true } },
    },
  });
  if (!appraisal) return notFound();

  const allowed = await canViewAppraisal(session, appraisal);
  if (!allowed) return forbidden();

  return NextResponse.json({
    ...appraisal,
    canEditSelf: canEditSelfAppraisal(session, appraisal),
    canEditManager: canEditManagerAppraisal(session, appraisal),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.performanceAppraisal.findUnique({
    where: { id },
    include: {
      kpiScores: { include: { kpi: { include: { cycleLinks: true } } } },
      cycle: { include: { kpis: true } },
    },
  });
  if (!existing) return notFound();

  const allowed = await canViewAppraisal(session, existing);
  if (!allowed) return forbidden();

  if (body.section === "self") {
    if (!canEditSelfAppraisal(session, existing)) return forbidden();

    if (Array.isArray(body.kpiScores)) {
      for (const row of body.kpiScores) {
        await prisma.appraisalKpiScore.update({
          where: { id: row.id },
          data: {
            selfScore: row.selfScore != null ? Number(row.selfScore) : null,
            selfNotes: row.selfNotes ?? null,
          },
        });
      }
    }

    const submit = Boolean(body.submit);
    await prisma.performanceAppraisal.update({
      where: { id },
      data: {
        selfRating: body.selfRating != null ? Number(body.selfRating) : undefined,
        selfAchievements: body.selfAchievements,
        selfComments: body.selfComments,
        ...(submit && {
          selfSubmittedAt: new Date(),
          status: "MANAGER_REVIEW",
        }),
      },
    });
  } else if (body.section === "manager") {
    if (!canEditManagerAppraisal(session, existing)) return forbidden();

    if (Array.isArray(body.kpiScores)) {
      for (const row of body.kpiScores) {
        await prisma.appraisalKpiScore.update({
          where: { id: row.id },
          data: {
            managerScore: row.managerScore != null ? Number(row.managerScore) : null,
            managerNotes: row.managerNotes ?? null,
          },
        });
      }
    }

    const submit = Boolean(body.submit);
    const updatedScores = await prisma.appraisalKpiScore.findMany({
      where: { appraisalId: id },
      include: { kpi: true },
    });

    const overall = computeOverallRating(
      updatedScores.map((s) => ({
        selfScore: s.selfScore,
        managerScore: s.managerScore,
        weight: existing.cycle.kpis.find((l) => l.kpiId === s.kpiId)?.weight ?? 1,
      }))
    );

    await prisma.performanceAppraisal.update({
      where: { id },
      data: {
        managerRating: body.managerRating != null ? Number(body.managerRating) : undefined,
        managerFeedback: body.managerFeedback,
        overallRating: overall != null ? Math.round(overall) : undefined,
        ...(submit && {
          managerSubmittedAt: new Date(),
          status: "COMPLETED",
          completedAt: new Date(),
        }),
      },
    });
  }

  revalidatePath("/performance");
  revalidatePath(`/performance/appraisals/${id}`);

  broadcastAppEvent("appraisal_updated", { id });
  broadcastAppEvent("performance_updated", { id });
  broadcastAppEvent("notification_updated", { id });

  const appraisal = await prisma.performanceAppraisal.findUnique({
    where: { id },
    include: {
      cycle: { include: { kpis: { include: { kpi: true } } } },
      employee: true,
      manager: true,
      kpiScores: { include: { kpi: true } },
    },
  });

  return NextResponse.json(appraisal);
}
