import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, checklistCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageTemplates } from "@/lib/checklist/access";

const STARTER_TASKS: Record<
  "ONBOARDING" | "OFFBOARDING",
  { title: string; description?: string; assigneeType: string; dueDaysOffset: number; sortOrder: number }[]
> = {
  ONBOARDING: [
    {
      title: "Prepare company welcome kit",
      description: "Laptop, badge, and welcome materials",
      assigneeType: "HR",
      dueDaysOffset: -1,
      sortOrder: 0,
    },
    {
      title: "Collect documents",
      description: "ID, tax forms, and signed contract",
      assigneeType: "EMPLOYEE",
      dueDaysOffset: 3,
      sortOrder: 1,
    },
    {
      title: "Line manager intro meeting",
      assigneeType: "LINE_MANAGER",
      dueDaysOffset: 1,
      sortOrder: 2,
    },
  ],
  OFFBOARDING: [
    {
      title: "Collect company assets",
      description: "Laptop, badge, keys, and access cards",
      assigneeType: "HR",
      dueDaysOffset: 0,
      sortOrder: 0,
    },
    {
      title: "Revoke system access",
      assigneeType: "HR",
      dueDaysOffset: 0,
      sortOrder: 1,
    },
    {
      title: "Exit interview",
      assigneeType: "LINE_MANAGER",
      dueDaysOffset: 1,
      sortOrder: 2,
    },
  ],
};

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const type = request.nextUrl.searchParams.get("type");
  const scope = getCompanyScope(session);

  const templates = await prisma.checklistTemplate.findMany({
    where: {
      ...checklistCompanyWhere(scope),
      ...(type ? { type } : {}),
    },
    include: {
      _count: { select: { tasks: true, instances: true } },
      tasks: { orderBy: { sortOrder: "asc" }, take: 5 },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManageTemplates(session)) return unauthorized();

  const { type, name, description, withStarterTasks = true } = await request.json();
  if (!type || !name?.trim()) return badRequest("Type and name are required");
  if (type !== "ONBOARDING" && type !== "OFFBOARDING") {
    return badRequest("type must be ONBOARDING or OFFBOARDING");
  }

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const starters = withStarterTasks ? STARTER_TASKS[type as "ONBOARDING" | "OFFBOARDING"] : [];

  const template = await prisma.checklistTemplate.create({
    data: {
      companyId,
      type,
      name: name.trim(),
      description: description?.trim() || null,
      isActive: true,
      tasks: starters.length
        ? {
            create: starters.map((t) => ({
              title: t.title,
              description: t.description ?? null,
              assigneeType: t.assigneeType,
              dueDaysOffset: t.dueDaysOffset,
              sortOrder: t.sortOrder,
            })),
          }
        : undefined,
    },
    include: { _count: { select: { tasks: true } }, tasks: true },
  });

  // New templates become the active default for that type
  await prisma.checklistTemplate.updateMany({
    where: {
      type,
      id: { not: template.id },
      ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}),
    },
    data: { isActive: false },
  });

  broadcastAppEvent("checklist_updated", { id: template.id, action: "template_created" });
  revalidatePath("/checklist/settings");
  revalidatePath("/checklist/onboarding");
  revalidatePath("/checklist/offboarding");
  return NextResponse.json(template);
}
