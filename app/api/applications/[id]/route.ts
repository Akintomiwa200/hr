import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { moveApplicationStage, logApplicationActivity } from "@/lib/recruitment/activity";
import { onboardHiredCandidate } from "@/lib/recruitment/provision-staff";
import { STAGE_TO_STATUS } from "@/lib/recruitment/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      job: { include: { department: true } },
      reviewer: true,
      tag: true,
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      evaluations: { include: { reviewer: true }, orderBy: { createdAt: "desc" } },
      interviews: { include: { interviewer: true, reviews: true }, orderBy: { scheduledAt: "desc" } },
    },
  });

  if (!application) return notFound();
  return NextResponse.json(application);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const { status, pipelineStage, reviewerId, notes, source, tagId, reason } = body;

  const existing = await prisma.jobApplication.findUnique({ where: { id } });
  if (!existing) return notFound();

  const actorName = session.firstName
    ? `${session.firstName} ${session.lastName ?? ""}`.trim()
    : session.email;

  let stageUpdated = false;
  if (pipelineStage && pipelineStage !== existing.pipelineStage) {
    await moveApplicationStage({
      applicationId: id,
      pipelineStage,
      actorName,
      reason,
    });
    stageUpdated = true;
  }

  const application = await prisma.jobApplication.update({
    where: { id },
    data: {
      ...(status !== undefined && !stageUpdated && { status }),
      ...(pipelineStage !== undefined && !stageUpdated && {
        pipelineStage,
        status: STAGE_TO_STATUS[pipelineStage] ?? existing.status,
      }),
      ...(reviewerId !== undefined && { reviewerId: reviewerId || null }),
      ...(notes !== undefined && { notes }),
      ...(source !== undefined && { source: source || null }),
      ...(tagId !== undefined && { tagId: tagId || null }),
    },
    include: {
      job: { include: { department: true } },
      reviewer: true,
      tag: true,
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
      evaluations: { include: { reviewer: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (notes !== undefined && notes !== existing.notes) {
    await logApplicationActivity({
      applicationId: id,
      type: "note",
      title: "Note updated",
      message: notes,
      actorName,
    });
  }

  if (application.status === "HIRED" && existing.status !== "HIRED" && !stageUpdated) {
    await onboardHiredCandidate(id, actorName);
  }

  broadcastAppEvent("job_updated", { id: application.jobId });
  revalidatePath("/recruitment/candidates");
  revalidatePath(`/recruitment/candidates/${id}`);
  revalidatePath(`/recruitment/${application.jobId}`);
  return NextResponse.json(application);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const existing = await prisma.jobApplication.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.jobApplication.delete({ where: { id } });
  broadcastAppEvent("job_updated", { id: existing.jobId });
  revalidatePath("/recruitment/candidates");
  revalidatePath(`/recruitment/${existing.jobId}`);
  return NextResponse.json({ success: true });
}
