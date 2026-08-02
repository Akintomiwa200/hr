import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const jobId = request.nextUrl.searchParams.get("jobId");
  const status = request.nextUrl.searchParams.get("status");

  const applications = await prisma.jobApplication.findMany({
    where: {
      ...(jobId ? { jobId } : {}),
      ...(status && status !== "ALL" ? { status: status as "APPLIED" } : {}),
    },
    include: {
      job: true,
      reviewer: true,
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
  const { jobId, firstName, lastName, email, phone, coverLetter, resumeUrl, status } = body;

  if (!jobId || !firstName || !lastName || !email) {
    return badRequest("Job, name, and email are required");
  }

  const application = await prisma.jobApplication.create({
    data: {
      jobId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || null,
      coverLetter: coverLetter || null,
      resumeUrl: resumeUrl || null,
      status: status || "APPLIED",
    },
    include: { job: true, reviewer: true },
  });

  broadcastEvent("job_updated", { id: jobId });
  revalidatePath("/recruitment");
  revalidatePath("/recruitment/candidates");
  revalidatePath(`/recruitment/${jobId}`);
  return NextResponse.json(application);
}
