import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";

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

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.departmentId !== undefined && { departmentId: body.departmentId }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.type !== undefined && { type: body.type }),
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
      ...(body.status !== undefined && {
        status: body.status,
        closedAt: body.status === "CLOSED" ? new Date() : null,
      }),
    },
    include: { department: true, applications: true },
  });

  broadcastEvent("job_updated", { id });
  revalidatePath("/recruitment");
  revalidatePath(`/recruitment/${id}`);
  return NextResponse.json(job);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || session.role !== "ADMIN") return unauthorized();

  const { id } = await params;
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.job.delete({ where: { id } });
  broadcastEvent("job_updated", { id });
  revalidatePath("/recruitment");
  return NextResponse.json({ success: true });
}
