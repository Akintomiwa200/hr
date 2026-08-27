import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, isPortalTemplateModelReady } from "@/lib/prisma";
import { requireSession, unauthorized, forbidden, badRequest, notFound } from "@/lib/api-auth";
import { canManageLetters, canViewLetterDocument } from "@/lib/letters/access";
import { parseFieldValues, parseFieldsJson } from "@/lib/letters/fields";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { createNotification } from "@/lib/notifications";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isPortalTemplateModelReady()) {
    return NextResponse.json({ error: "Letters & forms are not ready." }, { status: 503 });
  }

  const { id } = await params;
  const doc = await prisma.portalDocument.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true, jobTitle: true } },
      template: true,
    },
  });
  if (!doc) return notFound();
  if (!canViewLetterDocument(session, doc)) return forbidden();
  return NextResponse.json(doc);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isPortalTemplateModelReady()) {
    return NextResponse.json({ error: "Letters & forms are not ready." }, { status: 503 });
  }

  const { id } = await params;
  const doc = await prisma.portalDocument.findUnique({
    where: { id },
    include: { template: true, employee: { select: { userId: true, firstName: true, lastName: true } } },
  });
  if (!doc) return notFound();
  if (!canViewLetterDocument(session, doc)) return forbidden();

  const body = await request.json();
  const action = String(body.action ?? "");

  if (action === "acknowledge") {
    if (doc.kind !== "LETTER") return badRequest("Only letters can be acknowledged");
    const updated = await prisma.portalDocument.update({
      where: { id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    });
    broadcastAppEvent("letter_updated", { id, action: "acknowledged" });
    revalidatePath(`/letters/documents/${id}`);
    return NextResponse.json(updated);
  }

  if (action === "submit") {
    if (doc.kind !== "FORM") return badRequest("Only forms can be submitted");
    const values = parseFieldValues(JSON.stringify(body.values ?? {}));
    const fields = parseFieldsJson(doc.template?.fieldsJson);
    for (const field of fields) {
      if (field.required && !String(values[field.id] ?? "").trim()) {
        return badRequest(`${field.label} is required`);
      }
    }
    const updated = await prisma.portalDocument.update({
      where: { id },
      data: { status: "SUBMITTED", fieldValuesJson: JSON.stringify(values) },
    });
    broadcastAppEvent("letter_updated", { id, action: "submitted" });
    revalidatePath(`/letters/documents/${id}`);
    revalidatePath("/letters");
    return NextResponse.json(updated);
  }

  if (action === "void" && canManageLetters(session)) {
    const updated = await prisma.portalDocument.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    if (doc.employee?.userId) {
      await createNotification({
        userId: doc.employee.userId,
        type: "general",
        title: "Letter or form cancelled",
        message: doc.title,
        href: `/letters/documents/${id}`,
      });
    }
    broadcastAppEvent("letter_updated", { id, action: "voided" });
    revalidatePath("/letters");
    return NextResponse.json(updated);
  }

  return badRequest("Unknown action");
}
