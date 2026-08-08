import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";
import { logApplicationActivity } from "@/lib/recruitment/activity";
import { STAGE_TO_STATUS } from "@/lib/recruitment/constants";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const jobId = request.nextUrl.searchParams.get("jobId");
  const status = request.nextUrl.searchParams.get("status");
  const stage = request.nextUrl.searchParams.get("stage");
  const search = request.nextUrl.searchParams.get("search");

  const applications = await prisma.jobApplication.findMany({
    where: {
      ...(jobId ? { jobId } : {}),
      ...(status && status !== "ALL" ? { status: status as "APPLIED" } : {}),
      ...(stage && stage !== "ALL" ? { pipelineStage: stage } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      job: { include: { department: true } },
      reviewer: true,
      tag: true,
      interviews: {
        include: { interviewer: true, reviews: true },
        orderBy: { scheduledAt: "desc" },
      },
    },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json(applications);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const body = await request.json();
  const {
    jobId,
    firstName,
    lastName,
    email,
    phone,
    coverLetter,
    resumeUrl,
    photoUrl,
    source,
    tagId,
    status,
    pipelineStage,
  } = body;

  if (!jobId || !firstName || !lastName || !email) {
    return badRequest("Job, name, and email are required");
  }

  const stage = pipelineStage || "Applied";
  const application = await prisma.jobApplication.create({
    data: {
      jobId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || null,
      coverLetter: coverLetter || null,
      resumeUrl: resumeUrl || null,
      photoUrl: photoUrl || null,
      source: source || null,
      tagId: tagId || null,
      pipelineStage: stage,
      status: status || STAGE_TO_STATUS[stage] || "APPLIED",
    },
    include: { job: true, reviewer: true, tag: true },
  });

  await logApplicationActivity({
    applicationId: application.id,
    type: "created",
    title: "Application submitted",
    message: `${firstName} ${lastName} applied for ${application.job.title}`,
    actorName: session.firstName
      ? `${session.firstName} ${session.lastName ?? ""}`.trim()
      : session.email,
  });

  broadcastAppEvent("job_updated", { id: jobId });
  revalidatePath("/recruitment");
  revalidatePath("/recruitment/candidates");
  revalidatePath(`/recruitment/${jobId}`);
  return NextResponse.json(application);
}
