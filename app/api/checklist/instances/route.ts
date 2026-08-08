import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageChecklists } from "@/lib/checklist/access";
import { createChecklistFromTemplate } from "@/lib/checklist/instantiate";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const type = request.nextUrl.searchParams.get("type");
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  const scope = getCompanyScope(session);

  const where: Record<string, unknown> = {
    ...(scope.companyId ? { companyId: scope.companyId } : {}),
    ...(type ? { type } : {}),
    ...(employeeId ? { employeeId } : {}),
  };

  const instances = await prisma.checklistInstance.findMany({
    where,
    include: {
      employee: { include: { department: true } },
      tasks: true,
      template: true,
    },
    orderBy: { startDate: "desc" },
  });

  const mapped = instances.map((inst) => {
    const completed = inst.tasks.filter((t) => t.status === "COMPLETED").length;
    const total = inst.tasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      ...inst,
      progress: { completed, total, percent },
    };
  });

  return NextResponse.json(mapped);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManageChecklists(session)) return unauthorized();

  const { templateId, employeeId, type, startDate } = await request.json();
  if (!templateId || !employeeId || !type) {
    return badRequest("templateId, employeeId, and type are required");
  }

  const companyId = requireOrgCompanyId(getCompanyScope(session));

  const instance = await createChecklistFromTemplate({
    templateId,
    employeeId,
    companyId,
    type,
    startDate: startDate ? new Date(startDate) : undefined,
  });

  broadcastAppEvent("checklist_updated", { id: instance?.id, action: "instance_created" });
  revalidatePath("/checklist/onboarding");
  revalidatePath("/checklist/offboarding");
  return NextResponse.json(instance);
}
