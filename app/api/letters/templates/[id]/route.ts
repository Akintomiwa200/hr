import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, isPortalTemplateModelReady } from "@/lib/prisma";
import { requireSession, unauthorized, forbidden, badRequest, notFound } from "@/lib/api-auth";
import { getCompanyScope, portalTemplateCompanyWhere } from "@/lib/company-scope";
import { canManageLetters } from "@/lib/letters/access";
import { LETTER_CATEGORIES, FORM_CATEGORIES, parseFieldsJson } from "@/lib/letters/fields";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

function notReady() {
  return NextResponse.json(
    { error: "Letters & forms are not ready. Run prisma generate and restart." },
    { status: 503 }
  );
}

async function loadOwned(id: string, sessionCompanyId: string | null | undefined) {
  const template = await prisma.portalTemplate.findUnique({ where: { id } });
  if (!template) return null;
  const scope = { companyId: sessionCompanyId ?? null, isPlatformAdmin: false };
  const allowed = await prisma.portalTemplate.findFirst({
    where: { id, ...portalTemplateCompanyWhere(scope) },
  });
  return allowed;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageLetters(session)) return forbidden();
  if (!isPortalTemplateModelReady()) return notReady();

  const { id } = await params;
  const template = await loadOwned(id, session.companyId);
  if (!template) return notFound();
  return NextResponse.json(template);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageLetters(session)) return forbidden();
  if (!isPortalTemplateModelReady()) return notReady();

  const { id } = await params;
  const existing = await loadOwned(id, session.companyId);
  if (!existing) return notFound();

  const body = await request.json();
  const kind = body.kind === "FORM" || body.kind === "LETTER" ? body.kind : existing.kind;
  const categories = kind === "FORM" ? FORM_CATEGORIES : LETTER_CATEGORIES;
  const category =
    body.category && categories.some((c) => c.id === body.category)
      ? body.category
      : existing.category;

  if (body.title !== undefined && !String(body.title).trim()) {
    return badRequest("Title is required");
  }

  const template = await prisma.portalTemplate.update({
    where: { id },
    data: {
      kind,
      category,
      ...(body.title !== undefined && { title: String(body.title).trim() }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.body !== undefined && { body: String(body.body) }),
      ...(body.fields !== undefined && { fieldsJson: JSON.stringify(parseFieldsJson(JSON.stringify(body.fields))) }),
      ...(body.isPublished !== undefined && { isPublished: Boolean(body.isPublished) }),
    },
  });

  broadcastAppEvent("letter_updated", { id, action: "updated" });
  revalidatePath("/letters");
  revalidatePath(`/letters/${id}`);
  return NextResponse.json(template);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageLetters(session)) return forbidden();
  if (!isPortalTemplateModelReady()) return notReady();

  const { id } = await params;
  const existing = await loadOwned(id, session.companyId);
  if (!existing) return notFound();

  await prisma.portalTemplate.delete({ where: { id } });
  broadcastAppEvent("letter_updated", { id, action: "deleted" });
  revalidatePath("/letters");
  return NextResponse.json({ success: true });
}
