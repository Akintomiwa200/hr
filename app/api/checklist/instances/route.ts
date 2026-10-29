import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, companyMatchesScope } from "@/lib/company-scope";
import { canManageChecklists } from "@/lib/checklist/access";
import {
  createChecklistFromTemplate,
  ensureDefaultOffboardingTemplate,
  ensureDefaultOnboardingTemplate,
} from "@/lib/checklist/instantiate";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const type = request.nextUrl.searchParams.get("type");
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  const scope = getCompanyScope(session);

  const where: Record<string, unknown> = {
    ...(type ? { type } : {}),
    ...(employeeId ? { employeeId } : {}),
  };

  // Checklists are strictly per-company: no legacy/global rows are shared.
  if (scope.companyId) {
    where.companyId = scope.companyId;
  } else if (!scope.isPlatformAdmin) {
    where.companyId = "__none__";
  }

  // Employees only see their own checklists
  if (!canManageChecklists(session) && session.employeeId) {
    where.employeeId = session.employeeId;
  }

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

  try {
    const { templateId, employeeId, type, startDate } = await request.json();
    if (!employeeId || !type) {
      return badRequest("employeeId and type are required");
    }
    if (type !== "ONBOARDING" && type !== "OFFBOARDING") {
      return badRequest("type must be ONBOARDING or OFFBOARDING");
    }

    const scope = getCompanyScope(session);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, user: { select: { companyId: true } } },
    });
    if (!employee) return badRequest("Employee not found");

    const employeeCompanyId = employee.user?.companyId ?? null;
    if (!companyMatchesScope(scope, employeeCompanyId)) return unauthorized();
    const companyId = scope.companyId ?? employeeCompanyId;

    const existing = await prisma.checklistInstance.findFirst({
      where: {
        employeeId,
        type,
        status: { not: "COMPLETED" },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An active checklist already exists for this employee", instance: existing },
        { status: 409 }
      );
    }

    let resolvedTemplateId = templateId as string | undefined;
    if (resolvedTemplateId) {
      const template = await prisma.checklistTemplate.findUnique({
        where: { id: resolvedTemplateId },
        select: { id: true, companyId: true },
      });
      if (!template) return badRequest("Template not found");
      if (template.companyId !== companyId) {
        return badRequest("Template does not belong to this company");
      }
    } else {
      const template =
        type === "ONBOARDING"
          ? await ensureDefaultOnboardingTemplate(companyId)
          : await ensureDefaultOffboardingTemplate(companyId);
      resolvedTemplateId = template.id;
    }

    const instance = await createChecklistFromTemplate({
      templateId: resolvedTemplateId,
      employeeId,
      companyId,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
    });

    broadcastAppEvent("checklist_updated", {
      id: instance?.id,
      employeeId,
      action: "instance_created",
    });
    revalidatePath("/checklist/onboarding");
    revalidatePath("/checklist/offboarding");
    revalidatePath("/checklist/todos");
    return NextResponse.json(instance);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start checklist";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
