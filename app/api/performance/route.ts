import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { canManagePerformance } from "@/lib/roles";
import { employeeCompanyWhere, getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const roleWhere =
    (session.role === "EMPLOYEE" || session.role === "SUPERVISOR")
      ? { employeeId: session.employeeId ?? "__none__" }
      : session.role === "MANAGER" && session.employeeId
        ? { OR: [{ employeeId: session.employeeId }, { managerId: session.employeeId }] }
        : {};
  const whereClause = { AND: [{ employee: employeeCompanyWhere(getCompanyScope(session)) }, roleWhere] };

  const reviews = await prisma.performanceReview.findMany({
    where: whereClause,
    include: { employee: true, manager: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManagePerformance(session.role) || !session.employeeId) return unauthorized();

  const { employeeId, period, goals, achievements, feedback, rating, status } =
    await request.json();

  if (!employeeId || !period || !goals) {
    return badRequest("Employee, period, and goals are required");
  }
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId || !await prisma.employee.findFirst({ where: { id: employeeId, user: { companyId } }, select: { id: true } })) return unauthorized();

  const review = await prisma.performanceReview.create({
    data: {
      employeeId,
      managerId: session.employeeId,
      period,
      goals,
      achievements: achievements || null,
      feedback: feedback || null,
      rating: rating ? Number(rating) : null,
      status: status || "DRAFT",
      reviewDate: status === "COMPLETED" ? new Date() : null,
    },
    include: { employee: true, manager: true },
  });

  broadcastAppEvent("performance_updated", { id: review.id });
  revalidatePath("/performance");
  return NextResponse.json(review);
}
