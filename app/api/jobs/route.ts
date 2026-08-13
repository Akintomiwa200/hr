import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";
import { resolveRecruitmentCompanyId } from "@/lib/recruitment/data";
import { resolveHiringTeamMembers } from "@/lib/recruitment/provision-staff";
import type { HiringTeamMember } from "@/lib/recruitment/constants";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const companyId = await resolveRecruitmentCompanyId(session.id, session.companyId);
  const jobs = await prisma.job.findMany({
    where: companyId ? { OR: [{ companyId }, { companyId: null }] } : {},
    include: {
      department: true,
      applications: true,
    },
    orderBy: { postedAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const body = await request.json();
  const {
    title,
    departmentId,
    location,
    office,
    type,
    quantity,
    expectedClosingDate,
    salaryMin,
    salaryMax,
    description,
    requirements,
    responsibilities,
    benefits,
    status = "OPEN",
    hiringTeam,
    pipelineStages,
  } = body;

  if (!title || !departmentId || !location || !type || !description || !requirements) {
    return badRequest("Missing required job fields");
  }

  const companyId = await resolveRecruitmentCompanyId(session.id, session.companyId);

  const resolvedTeam =
    Array.isArray(hiringTeam) && hiringTeam.length > 0
      ? await resolveHiringTeamMembers(hiringTeam as HiringTeamMember[], {
          companyId,
          departmentId,
          jobTitle: title,
        })
      : [];

  const job = await prisma.job.create({
    data: {
      title,
      departmentId,
      companyId,
      location,
      office: office || null,
      type,
      quantity: quantity ? Number(quantity) : 1,
      expectedClosingDate: expectedClosingDate ? new Date(expectedClosingDate) : null,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      description,
      requirements,
      responsibilities: responsibilities || null,
      benefits: benefits || null,
      status,
      hiringTeam: resolvedTeam.length > 0 ? JSON.stringify(resolvedTeam) : null,
      pipelineStages: pipelineStages ? JSON.stringify(pipelineStages) : null,
    },
    include: { department: true, applications: true },
  });

  broadcastAppEvent("job_updated", { id: job.id });
  revalidatePath("/recruitment");
  revalidatePath("/careers");
  return NextResponse.json(job);
}
