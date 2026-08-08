import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageRecruitment } from "@/lib/roles";
import { resolveRecruitmentCompanyId } from "@/lib/recruitment/data";
import { resolveHiringTeamMembers } from "@/lib/recruitment/provision-staff";
import type { HiringTeamMember } from "@/lib/recruitment/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      department: true,
      applications: {
        include: { reviewer: true },
        orderBy: { appliedAt: "desc" },
      },
    },
  });

  if (!job) return notFound();
  return NextResponse.json(job);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return notFound();

  let resolvedHiringTeam: string | null | undefined;
  if (body.hiringTeam !== undefined) {
    const companyId = await resolveRecruitmentCompanyId(session.id, session.companyId);
    const members = Array.isArray(body.hiringTeam)
      ? ((await resolveHiringTeamMembers(body.hiringTeam as HiringTeamMember[], {
          companyId,
          departmentId: body.departmentId ?? existing.departmentId,
          jobTitle: body.title ?? existing.title,
        })) as HiringTeamMember[])
      : [];
    resolvedHiringTeam = members.length > 0 ? JSON.stringify(members) : null;
  }

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.departmentId !== undefined && { departmentId: body.departmentId }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.office !== undefined && { office: body.office || null }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.quantity !== undefined && { quantity: Number(body.quantity) || 1 }),
      ...(body.expectedClosingDate !== undefined && {
        expectedClosingDate: body.expectedClosingDate ? new Date(body.expectedClosingDate) : null,
      }),
      ...(body.salaryMin !== undefined && {
        salaryMin: body.salaryMin ? Number(body.salaryMin) : null,
      }),
      ...(body.salaryMax !== undefined && {
        salaryMax: body.salaryMax ? Number(body.salaryMax) : null,
      }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.requirements !== undefined && { requirements: body.requirements }),
      ...(body.responsibilities !== undefined && { responsibilities: body.responsibilities }),
      ...(body.benefits !== undefined && { benefits: body.benefits }),
      ...(resolvedHiringTeam !== undefined && { hiringTeam: resolvedHiringTeam }),
      ...(body.pipelineStages !== undefined && {
        pipelineStages: body.pipelineStages ? JSON.stringify(body.pipelineStages) : null,
      }),
      ...(body.status !== undefined && {
        status: body.status,
        closedAt: body.status === "CLOSED" ? new Date() : null,
      }),
    },
    include: { department: true, applications: true },
  });

  broadcastAppEvent("job_updated", { id });
  revalidatePath("/recruitment");
  revalidatePath(`/recruitment/${id}`);
  return NextResponse.json(job);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageRecruitment(session.role)) return unauthorized();

  const { id } = await params;
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.job.delete({ where: { id } });
  broadcastAppEvent("job_updated", { id });
  revalidatePath("/recruitment");
  return NextResponse.json({ success: true });
}
