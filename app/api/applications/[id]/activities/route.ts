import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { logApplicationActivity } from "@/lib/recruitment/activity";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const activities = await prisma.applicationActivity.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(activities);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.jobApplication.findUnique({ where: { id } });
  if (!existing) return notFound();

  const activity = await logApplicationActivity({
    applicationId: id,
    type: body.type || "note",
    title: body.title || "Note added",
    message: body.message,
    actorName: session.firstName
      ? `${session.firstName} ${session.lastName ?? ""}`.trim()
      : session.email,
  });

  revalidatePath(`/recruitment/candidates/${id}`);
  return NextResponse.json(activity);
}
