import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageRecruitment } from "@/lib/roles";
import { cancelInterview, rescheduleInterview } from "@/lib/recruitment/interviews";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      application: { include: { job: { include: { department: true } } } },
      interviewer: true,
      reviews: { include: { reviewer: true } },
    },
  });
  if (!interview) return notFound();
  return NextResponse.json(interview);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  try {
    const interview =
      body.action === "cancel"
        ? await cancelInterview(id)
        : await rescheduleInterview(id, {
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
            durationMinutes:
              body.durationMinutes !== undefined ? Number(body.durationMinutes) : undefined,
            interviewerId: body.interviewerId,
            type: body.type,
            location: body.location,
            notes: body.notes,
            status: body.status,
          });

    revalidatePath("/recruitment/interviews");
    revalidatePath(`/recruitment/candidates/${interview.applicationId}`);
    revalidatePath("/holidays");
    broadcastAppEvent("interview_updated", {
      id,
      action: body.action === "cancel" ? "cancelled" : "updated",
    });
    return NextResponse.json(interview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageRecruitment(session.role)) return unauthorized();

  const { id } = await params;
  await cancelInterview(id);
  broadcastAppEvent("interview_updated", { id, action: "deleted" });
  return NextResponse.json({ success: true });
}
