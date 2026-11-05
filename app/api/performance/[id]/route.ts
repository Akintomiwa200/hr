import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManagePerformance } from "@/lib/roles";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManagePerformance(session.role)) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return notFound();

  const existing = await prisma.performanceReview.findFirst({ where: { id, employee: { user: { companyId } } } });
  if (!existing) return notFound();

  const review = await prisma.performanceReview.update({
    where: { id },
    data: {
      ...(body.period !== undefined && { period: body.period }),
      ...(body.goals !== undefined && { goals: body.goals }),
      ...(body.achievements !== undefined && { achievements: body.achievements }),
      ...(body.feedback !== undefined && { feedback: body.feedback }),
      ...(body.rating !== undefined && {
        rating: body.rating ? Number(body.rating) : null,
      }),
      ...(body.status !== undefined && {
        status: body.status,
        reviewDate: body.status === "COMPLETED" ? new Date() : existing.reviewDate,
      }),
    },
    include: { employee: true, manager: true },
  });

  broadcastAppEvent("performance_updated", { id });
  revalidatePath("/performance");
  return NextResponse.json(review);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManagePerformance(session.role)) return unauthorized();

  const { id } = await params;
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return notFound();
  const existing = await prisma.performanceReview.findFirst({ where: { id, employee: { user: { companyId } } } });
  if (!existing) return notFound();

  await prisma.performanceReview.delete({ where: { id } });
  broadcastAppEvent("performance_updated", { id });
  revalidatePath("/performance");
  return NextResponse.json({ success: true });
}
