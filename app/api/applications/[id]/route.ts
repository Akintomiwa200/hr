import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: { job: { include: { department: true } }, reviewer: true },
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
  const { status, reviewerId, notes } = await request.json();

  const existing = await prisma.jobApplication.findUnique({ where: { id } });
  if (!existing) return notFound();

  const application = await prisma.jobApplication.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(reviewerId !== undefined && { reviewerId: reviewerId || null }),
      ...(notes !== undefined && { notes }),
    },
    include: { job: { include: { department: true } }, reviewer: true },
  });

  broadcastAppEvent("job_updated", { id: application.jobId });
  revalidatePath("/recruitment/candidates");
  revalidatePath(`/recruitment/candidates/${id}`);
  return NextResponse.json(application);
}
