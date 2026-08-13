import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { revalidatePath } from "next/cache";
import { logApplicationActivity } from "@/lib/recruitment/activity";
import { STAGE_TO_STATUS } from "@/lib/recruitment/constants";
import { createNotification } from "@/lib/notifications";

const publicJobSelect = {
  id: true,
  title: true,
  location: true,
  office: true,
  type: true,
  quantity: true,
  salaryMin: true,
  salaryMax: true,
  description: true,
  requirements: true,
  responsibilities: true,
  benefits: true,
  status: true,
  postedAt: true,
  expectedClosingDate: true,
  department: { select: { id: true, name: true } },
  company: { select: { id: true, name: true, slug: true } },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, status: "OPEN" },
    select: publicJobSelect,
  });
  if (!job) return notFound();
  return NextResponse.json(job);
}

/** Public apply — no session required. Only OPEN jobs. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const body = await request.json().catch(() => null);

  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const coverLetter =
    typeof body?.coverLetter === "string" ? body.coverLetter.trim() : "";
  const resumeUrl =
    typeof body?.resumeUrl === "string" ? body.resumeUrl.trim() : "";

  if (!firstName || !lastName || !email) {
    return badRequest("First name, last name, and email are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("Enter a valid email address.");
  }

  const job = await prisma.job.findFirst({
    where: { id: jobId, status: "OPEN" },
    select: {
      id: true,
      title: true,
      companyId: true,
    },
  });
  if (!job) return notFound();

  const existing = await prisma.jobApplication.findFirst({
    where: { jobId, email },
    select: { id: true },
  });
  if (existing) {
    return badRequest("You have already applied to this role with this email.");
  }

  const stage = "Applied";
  const application = await prisma.jobApplication.create({
    data: {
      jobId,
      firstName,
      lastName,
      email,
      phone: phone || null,
      coverLetter: coverLetter || null,
      resumeUrl: resumeUrl || null,
      source: "Careers page",
      pipelineStage: stage,
      status: STAGE_TO_STATUS[stage] || "APPLIED",
    },
  });

  await logApplicationActivity({
    applicationId: application.id,
    type: "created",
    title: "Application submitted",
    message: `${firstName} ${lastName} applied via the Careers page for ${job.title}`,
    actorName: `${firstName} ${lastName}`,
  });

  if (job.companyId) {
    const hrUsers = await prisma.user.findMany({
      where: {
        companyId: job.companyId,
        role: { in: ["HR", "COMPANY_ADMIN"] },
      },
      select: { id: true },
      take: 20,
    });
    for (const user of hrUsers) {
      await createNotification({
        userId: user.id,
        type: "general",
        title: "New job application",
        message: `${firstName} ${lastName} applied for ${job.title}`,
        href: `/recruitment/${jobId}`,
      });
    }
  }

  broadcastAppEvent("job_updated", { id: jobId, action: "application" });
  revalidatePath("/careers");
  revalidatePath(`/careers/${jobId}`);
  revalidatePath("/recruitment");
  revalidatePath("/recruitment/candidates");
  revalidatePath(`/recruitment/${jobId}`);

  return NextResponse.json({
    ok: true,
    id: application.id,
    message: "Application submitted. Our team will review it shortly.",
  });
}
