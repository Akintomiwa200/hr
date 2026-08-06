import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const jobs = await prisma.job.findMany({
    include: {
      department: true,
      applications: true,
    },
    orderBy: { postedAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const body = await request.json();
  const {
    title,
    departmentId,
    location,
    type,
    salaryMin,
    salaryMax,
    description,
    requirements,
    responsibilities,
    benefits,
    status = "OPEN",
  } = body;

  if (!title || !departmentId || !location || !type || !description || !requirements) {
    return badRequest("Missing required job fields");
  }

  const job = await prisma.job.create({
    data: {
      title,
      departmentId,
      location,
      type,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      description,
      requirements,
      responsibilities: responsibilities || null,
      benefits: benefits || null,
      status,
    },
    include: { department: true, applications: true },
  });

  broadcastAppEvent("job_updated", { id: job.id });
  revalidatePath("/recruitment");
  return NextResponse.json(job);
}
