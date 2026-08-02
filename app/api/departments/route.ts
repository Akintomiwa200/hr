import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const departments = await prisma.department.findMany({
    include: { _count: { select: { employees: true, jobs: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { name, description } = await request.json();
  if (!name?.trim()) return badRequest("Department name is required");

  const department = await prisma.department.create({
    data: { name: name.trim(), description: description?.trim() || null },
    include: { _count: { select: { employees: true, jobs: true } } },
  });

  broadcastEvent("department_updated", { id: department.id });
  revalidatePath("/departments");
  revalidatePath("/teams");
  return NextResponse.json(department);
}
