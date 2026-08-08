import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";
import { ensureRecruitmentDefaults } from "@/lib/recruitment/activity";
import { resolveRecruitmentCompanyId } from "@/lib/recruitment/data";
import { isRecruitmentModelsReady } from "@/lib/prisma";

export async function GET() {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const companyId = await resolveRecruitmentCompanyId(session.id, session.companyId);

  if (companyId && isRecruitmentModelsReady()) await ensureRecruitmentDefaults(companyId);

  if (!isRecruitmentModelsReady()) {
    return NextResponse.json({ stages: [], tags: [], sources: [], templates: [] });
  }

  const [stages, tags, sources, templates] = await Promise.all([
    prisma.recruitmentStage.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { sortOrder: "asc" },
    }),
    prisma.recruitmentTag.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { name: "asc" },
      include: { _count: { select: { applications: true } } },
    }),
    prisma.recruitmentSource.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { name: "asc" },
    }),
    prisma.recruitmentEmailTemplate.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ stages, tags, sources, templates });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  if (!isRecruitmentModelsReady()) {
    return NextResponse.json(
      { error: "Recruitment settings are not ready. Restart the dev server after running: pnpm exec prisma generate" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { type } = body;
  const companyId = await resolveRecruitmentCompanyId(session.id, session.companyId);

  if (type === "stage") {
    const stage = await prisma.recruitmentStage.create({
      data: {
        companyId,
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
        color: body.color ?? "blue",
      },
    });
    revalidatePath("/recruitment/settings");
    return NextResponse.json(stage);
  }

  if (type === "tag") {
    const tag = await prisma.recruitmentTag.create({
      data: { companyId, name: body.name, color: body.color ?? "violet" },
    });
    revalidatePath("/recruitment/settings");
    return NextResponse.json(tag);
  }

  if (type === "source") {
    const source = await prisma.recruitmentSource.create({
      data: { companyId, name: body.name },
    });
    revalidatePath("/recruitment/settings");
    return NextResponse.json(source);
  }

  if (type === "template") {
    const template = await prisma.recruitmentEmailTemplate.create({
      data: {
        companyId,
        name: body.name,
        subject: body.subject,
        body: body.body,
        stage: body.stage || null,
      },
    });
    revalidatePath("/recruitment/settings");
    return NextResponse.json(template);
  }

  return badRequest("Invalid settings type");
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  if (!isRecruitmentModelsReady()) {
    return NextResponse.json(
      { error: "Recruitment settings are not ready. Restart the dev server after running: pnpm exec prisma generate" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { type, id } = body;
  if (!type || !id) return badRequest("type and id are required");

  if (type === "stage") {
    const stage = await prisma.recruitmentStage.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.color !== undefined && { color: body.color }),
      },
    });
    revalidatePath("/recruitment/settings");
    return NextResponse.json(stage);
  }

  if (type === "template") {
    const template = await prisma.recruitmentEmailTemplate.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.body !== undefined && { body: body.body }),
        ...(body.stage !== undefined && { stage: body.stage }),
      },
    });
    revalidatePath("/recruitment/settings");
    return NextResponse.json(template);
  }

  return badRequest("Invalid update type");
}

export async function DELETE(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  if (!isRecruitmentModelsReady()) {
    return NextResponse.json(
      { error: "Recruitment settings are not ready. Restart the dev server after running: pnpm exec prisma generate" },
      { status: 503 }
    );
  }

  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id");
  if (!type || !id) return badRequest("type and id are required");

  if (type === "stage") await prisma.recruitmentStage.delete({ where: { id } });
  else if (type === "tag") await prisma.recruitmentTag.delete({ where: { id } });
  else if (type === "source") await prisma.recruitmentSource.delete({ where: { id } });
  else if (type === "template") await prisma.recruitmentEmailTemplate.delete({ where: { id } });
  else return badRequest("Invalid delete type");

  revalidatePath("/recruitment/settings");
  return NextResponse.json({ success: true });
}
