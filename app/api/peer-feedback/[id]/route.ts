import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return notFound();
  const assigned = await prisma.peerFeedbackRequest.findFirst({ where: { id, companyId } });
  if (!assigned) return notFound();
  if (assigned.reviewerEmployeeId !== session.employeeId || assigned.status !== "PENDING") return forbidden();
  const body = await request.json();
  const feedback = String(body.feedback ?? "").trim();
  const rating = Number(body.rating);
  if (feedback.length < 10) return badRequest("Please provide at least 10 characters of useful feedback.");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return badRequest("Choose a rating from 1 to 5.");
  const updated = await prisma.peerFeedbackRequest.update({ where: { id }, data: { feedback, rating, status: "SUBMITTED", submittedAt: new Date() } });
  broadcastAppEvent("staff_review_updated", { companyId, action: "peer_feedback_submitted", id });
  return NextResponse.json(updated);
}
