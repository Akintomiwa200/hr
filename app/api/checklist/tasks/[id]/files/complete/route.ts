import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-auth";
import { canUploadChecklistDocument } from "@/lib/checklist/task-access";
import { insertTaskFile } from "@/lib/checklist/document-store";
import { readChecklistUploadTicket } from "@/lib/checklist/cloudinary-upload";
import { recordChecklistTaskDocument } from "@/lib/checklist/task-documents";
import { getCloudinaryConfig } from "@/lib/cloudinary";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const config = getCloudinaryConfig();
  if (!config) return NextResponse.json({ error: "Cloudinary is not configured on the server." }, { status: 503 });
  const ticket = typeof body?.ticket === "string" ? readChecklistUploadTicket(body.ticket, config.apiSecret) : null;
  if (!ticket || ticket.taskId !== id || ticket.uploaderId !== session.id) {
    return NextResponse.json({ error: "This upload confirmation is invalid or expired. Please upload the file again." }, { status: 400 });
  }

  const task = await prisma.checklistTask.findUnique({
    where: { id },
    include: {
      instance: {
        include: {
          employee: { select: { id: true, user: { select: { companyId: true } } } },
        },
      },
    },
  });
  if (!task || !canUploadChecklistDocument(session, task)) return unauthorized();
  const companyId = task.instance.companyId ?? task.instance.employee.user.companyId;
  if (task.instance.employeeId !== ticket.employeeId || companyId !== ticket.companyId) {
    return NextResponse.json({ error: "The task changed while this file was uploading. Please try again." }, { status: 409 });
  }

  const secureUrl = typeof body?.secure_url === "string" ? body.secure_url : "";
  const publicId = typeof body?.public_id === "string" ? body.public_id : "";
  const resourceType = typeof body?.resource_type === "string" ? body.resource_type : "";
  const bytes = Number(body?.bytes);
  let uploadedUrl: URL;
  try { uploadedUrl = new URL(secureUrl); } catch { return NextResponse.json({ error: "Cloudinary returned an invalid file URL." }, { status: 400 }); }
  if (
    uploadedUrl.protocol !== "https:" || uploadedUrl.hostname !== "res.cloudinary.com" ||
    uploadedUrl.pathname.split("/")[1] !== config.cloudName ||
    publicId !== ticket.publicId || resourceType !== ticket.resourceType || bytes !== ticket.fileSize
  ) {
    return NextResponse.json({ error: "The uploaded file did not match the authorized upload." }, { status: 400 });
  }

  const existing = await prisma.checklistTaskFile.findFirst({ where: { taskId: id, publicId } });
  if (existing) return NextResponse.json({ ...existing, documentId: null, alreadySaved: true });

  const record = await insertTaskFile({
    taskId: id,
    documentName: ticket.documentName,
    fileName: ticket.fileName,
    fileUrl: secureUrl,
    publicId,
    fileSize: bytes,
    mimeType: ticket.mimeType,
    uploadedById: session.employeeId ?? null,
    uploadedByName: ticket.uploaderName,
  });
  if (task.status === "PENDING") await prisma.checklistTask.update({ where: { id }, data: { status: "IN_PROGRESS" } });

  let documentId: string | null = null;
  try {
    const document = await recordChecklistTaskDocument({
      companyId,
      employeeId: ticket.employeeId,
      documentName: ticket.documentName,
      fileName: ticket.fileName,
      fileUrl: secureUrl,
      publicId,
      fileSize: bytes,
      mimeType: ticket.mimeType,
      storageType: ticket.resourceType,
      uploadedById: session.id,
      uploadedByName: ticket.uploaderName,
    });
    documentId = document.id;
  } catch (error) {
    console.error("Could not add checklist upload to Documents", error);
  }

  broadcastAppEvent("checklist_updated", { id, action: "document_uploaded" });
  broadcastAppEvent("document_updated", { taskId: id, fileId: record.id, documentId });
  revalidatePath("/checklist/todos");
  revalidatePath("/checklist/onboarding");
  revalidatePath("/checklist/offboarding");
  revalidatePath("/documents");
  return NextResponse.json({ ...record, documentId });
}
