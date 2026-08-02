import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { employeeId: session.employeeId }
      : session.role === "MANAGER" && session.employeeId
        ? { OR: [{ employeeId: session.employeeId }, { managerId: session.employeeId }] }
        : {};

  const reviews = await prisma.performanceReview.findMany({
    where: whereClause,
    include: { employee: true, manager: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session) || !session.employeeId) return unauthorized();

  const { employeeId, period, goals, achievements, feedback, rating, status } =
    await request.json();

  if (!employeeId || !period || !goals) {
    return badRequest("Employee, period, and goals are required");
  }

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

  broadcastEvent("performance_updated", { id: review.id });
  revalidatePath("/performance");
  return NextResponse.json(review);
}
