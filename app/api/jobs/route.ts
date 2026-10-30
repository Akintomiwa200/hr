import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageRecruitment, isSuperAdmin } from "@/lib/roles";
import { resolveRecruitmentCompanyId } from "@/lib/recruitment/data";
import { resolveHiringTeamMembers } from "@/lib/recruitment/provision-staff";
import type { HiringTeamMember } from "@/lib/recruitment/constants";
import { audit } from "@/lib/audit";

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
  if (!session || !canManageRecruitment(session.role)) return unauthorized();

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
  if (!(["OPEN", "INACTIVE", "CLOSED", "DRAFT"] as string[]).includes(status)) {
    return badRequest("Choose a valid job status.");
  }

  const companyId = await resolveRecruitmentCompanyId(session.id, session.companyId);
  const department = await prisma.department.findUnique({ where: { id: departmentId }, select: { companyId: true } });
  if (!department || (department.companyId !== companyId && !isSuperAdmin(session.role))) {
    return NextResponse.json({ error: "Choose a department in your company." }, { status: 403 });
  }

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
  await audit({
    actor: session,
    module: "recruitment",
    action: "CREATE",
    entityId: job.id,
    entityLabel: job.title,
    meta: { departmentId, type, status },
  });
  revalidatePath("/recruitment");
  revalidatePath("/careers");
  return NextResponse.json(job);
}
