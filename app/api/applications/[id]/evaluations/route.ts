import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { logApplicationActivity } from "@/lib/recruitment/activity";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const evaluations = await prisma.applicationEvaluation.findMany({
    where: { applicationId: id },
    include: { reviewer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(evaluations);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !session.employeeId || !isHr(session)) return unauthorized();

  const { id } = await params;
  const { rating, feedback } = await request.json();
  if (!rating) return badRequest("Rating is required");

  const existing = await prisma.jobApplication.findUnique({ where: { id } });
  if (!existing) return notFound();

  const evaluation = await prisma.applicationEvaluation.create({
    data: {
      applicationId: id,
      reviewerId: session.employeeId,
      rating,
      feedback: feedback || null,
    },
    include: { reviewer: true },
  });

  await logApplicationActivity({
    applicationId: id,
    type: "evaluation",
    title: "Evaluation submitted",
    message: feedback || `Rating: ${rating}`,
    actorName: session.firstName
      ? `${session.firstName} ${session.lastName ?? ""}`.trim()
      : session.email,
  });

  revalidatePath(`/recruitment/candidates/${id}`);
  return NextResponse.json(evaluation);
}
