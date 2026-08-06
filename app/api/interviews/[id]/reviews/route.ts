import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  isHr,
  notFound,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();
  if (!session.employeeId) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const { rating, strengths, weaknesses, recommendation, notes } = body;

  if (!rating || !recommendation) {
    return badRequest("Rating and recommendation are required");
  }

  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview) return notFound();

  const review = await prisma.interviewReview.create({
    data: {
      interviewId: id,
      reviewerId: session.employeeId,
      rating: Number(rating),
      strengths: strengths ?? null,
      weaknesses: weaknesses ?? null,
      recommendation,
      notes: notes ?? null,
    },
    include: { reviewer: true },
  });

  if (interview.status === "SCHEDULED") {
    await prisma.interview.update({
      where: { id },
      data: { status: "COMPLETED" },
    });
  }

  revalidatePath(`/recruitment/candidates/${interview.applicationId}`);
  revalidatePath("/recruitment/interviews");
  broadcastAppEvent("interview_updated", { id, action: "reviewed" });
  return NextResponse.json(review);
}
