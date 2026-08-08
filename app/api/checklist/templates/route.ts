import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, checklistCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageTemplates } from "@/lib/checklist/access";

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
    include: { _count: { select: { tasks: true, instances: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManageTemplates(session)) return unauthorized();

  const { type, name, description } = await request.json();
  if (!type || !name?.trim()) return badRequest("Type and name are required");

  const companyId = requireOrgCompanyId(getCompanyScope(session));

  const template = await prisma.checklistTemplate.create({
    data: {
      companyId,
      type,
      name: name.trim(),
      description: description?.trim() || null,
    },
    include: { _count: { select: { tasks: true } } },
  });

  broadcastAppEvent("checklist_updated", { id: template.id, action: "template_created" });
  revalidatePath("/checklist/settings");
  return NextResponse.json(template);
}
