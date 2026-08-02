import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isHr, requireSession, unauthorized, badRequest } from "@/lib/api-auth";
import { scheduleInterview } from "@/lib/recruitment/interviews";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const status = request.nextUrl.searchParams.get("status");
  const applicationId = request.nextUrl.searchParams.get("applicationId");

  const interviews = await prisma.interview.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as "SCHEDULED" } : {}),
      ...(applicationId ? { applicationId } : {}),
    },
    include: {
      application: { include: { job: true } },
      interviewer: true,
      reviews: { include: { reviewer: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(interviews);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const body = await request.json();
  const { applicationId, interviewerId, scheduledAt, durationMinutes, type, location, notes } =
    body;

  if (!applicationId || !interviewerId || !scheduledAt) {
    return badRequest("Application, interviewer, and scheduled time are required");
  }

  try {
    const interview = await scheduleInterview({
      applicationId,
      interviewerId,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
      type,
      location,
      notes,
    });

    revalidatePath("/recruitment");
    revalidatePath("/recruitment/candidates");
    revalidatePath(`/recruitment/candidates/${applicationId}`);
    revalidatePath("/recruitment/interviews");
    revalidatePath("/holidays");

    return NextResponse.json(interview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to schedule interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
