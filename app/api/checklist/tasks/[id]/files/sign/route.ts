import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-auth";
import { canUploadChecklistDocument } from "@/lib/checklist/task-access";
import {
  CHECKLIST_UPLOAD_EXTENSIONS,
  CHECKLIST_UPLOAD_MAX_BYTES,
  checklistUploadDetails,
  createChecklistUploadTicket,
} from "@/lib/checklist/cloudinary-upload";
import { getCloudinaryConfig, signCloudinaryUploadParams } from "@/lib/cloudinary";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const documentName = typeof body?.documentName === "string" ? body.documentName.trim() : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "application/octet-stream";
  const fileSize = Number(body?.fileSize);
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!documentName || !fileName || !Number.isInteger(fileSize) || fileSize < 1) {
    return NextResponse.json({ error: "Choose a document name and a non-empty file." }, { status: 400 });
  }
  if (fileSize > CHECKLIST_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "Files must be 100 MB or smaller." }, { status: 413 });
  }
  if (!CHECKLIST_UPLOAD_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: "This file format is not supported. Use PDF, Office, OpenDocument, text, CSV, ZIP, or common image files." }, { status: 415 });
  }

  const task = await prisma.checklistTask.findUnique({
    where: { id },
    include: {
      instance: {
        include: {
          employee: { select: { id: true, employeeCode: true, user: { select: { companyId: true } } } },
        },
      },
    },
  });
  if (!task || !canUploadChecklistDocument(session, task)) return unauthorized();

  const config = getCloudinaryConfig();
  if (!config) return NextResponse.json({ error: "Cloudinary is not configured on the server." }, { status: 503 });

  const companyId = task.instance.companyId ?? task.instance.employee.user.companyId;
  const uploaderName = `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim() || session.email;
  const upload = checklistUploadDetails({
    taskId: task.id,
    companyId,
    employeeId: task.instance.employee.id,
    employeeCode: task.instance.employee.employeeCode,
    documentName,
    fileName,
    mimeType,
    fileSize,
    uploaderId: session.id,
    uploaderName,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryUploadParams({ public_id: upload.publicId, timestamp }, config.apiSecret);
  const ticket = createChecklistUploadTicket(upload, config.apiSecret);
  return NextResponse.json({
    ticket,
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    resourceType: upload.resourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${upload.resourceType}/upload`,
    params: { public_id: upload.publicId, timestamp, signature, api_key: config.apiKey },
  });
}
