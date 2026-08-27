import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, isPortalTemplateModelReady } from "@/lib/prisma";
import { requireSession, unauthorized, forbidden, badRequest } from "@/lib/api-auth";
import { getCompanyScope, portalTemplateCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageLetters } from "@/lib/letters/access";
import { STARTER_TEMPLATES } from "@/lib/letters/starters";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { LETTER_CATEGORIES, FORM_CATEGORIES, parseFieldsJson } from "@/lib/letters/fields";

function notReady() {
  return NextResponse.json(
    { error: "Letters & forms are not ready. Run prisma generate and restart." },
    { status: 503 }
  );
}

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageLetters(session)) return forbidden();
  if (!isPortalTemplateModelReady()) return notReady();

  const scope = getCompanyScope(session);
  const templates = await prisma.portalTemplate.findMany({
    where: portalTemplateCompanyWhere(scope),
    include: { _count: { select: { documents: true } } },
    orderBy: [{ kind: "asc" }, { title: "asc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageLetters(session)) return forbidden();
  if (!isPortalTemplateModelReady()) return notReady();

  const body = await request.json();
  const starterId = typeof body.starterId === "string" ? body.starterId : null;
  const starter = starterId
    ? STARTER_TEMPLATES.find((s) => `${s.kind}:${s.category}` === starterId)
    : null;

  const kind = (starter?.kind ?? body.kind ?? "LETTER") === "FORM" ? "FORM" : "LETTER";
  const categories = kind === "FORM" ? FORM_CATEGORIES : LETTER_CATEGORIES;
  const category =
    starter?.category ??
    (categories.some((c) => c.id === body.category) ? body.category : "CUSTOM");
  const title = String(starter?.title ?? body.title ?? "").trim();
  if (!title) return badRequest("Title is required");

  const fields = starter?.fields ?? parseFieldsJson(JSON.stringify(body.fields ?? []));
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const createdByName = `${session.firstName ?? "HR"} ${session.lastName ?? ""}`.trim();

  const template = await prisma.portalTemplate.create({
    data: {
      companyId,
      kind,
      category,
      title,
      description: starter?.description ?? body.description ?? null,
      body: starter?.body ?? body.body ?? "",
      fieldsJson: JSON.stringify(fields),
      isPublished: body.isPublished !== false,
      createdByName,
    },
  });

  broadcastAppEvent("letter_updated", { id: template.id, action: "created" });
  revalidatePath("/letters");
  return NextResponse.json(template);
}
