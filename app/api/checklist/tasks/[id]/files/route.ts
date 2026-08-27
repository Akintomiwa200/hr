import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageChecklists } from "@/lib/checklist/access";
import { canUploadChecklistDocument } from "@/lib/checklist/task-access";
import { slugDocumentName } from "@/lib/checklist/documents";
import { deleteTaskFile, fetchTaskFiles, findTaskFile, insertTaskFile } from "@/lib/checklist/document-store";
import { deleteCloudinaryFile, uploadChecklistFileToCloudinary } from "@/lib/cloudinary";

const MAX_BYTES = 12 * 1024 * 1024;

function authorName(session: { firstName?: string; lastName?: string; email: string }) {
  const name = `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim();
  return name || session.email;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const task = await prisma.checklistTask.findUnique({
    where: { id },
    include: {
      instance: { include: { employee: true } },
    },
  });
  if (!task) return notFound();
  if (!canUploadChecklistDocument(session, task) && !canManageChecklists(session)) {
    return unauthorized();
  }
  return NextResponse.json(await fetchTaskFiles(id));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;

  const task = await prisma.checklistTask.findUnique({
    where: { id },
    include: { instance: { include: { employee: true } } },
  });
  if (!task) return notFound();
  if (!canUploadChecklistDocument(session, task)) return unauthorized();

  const form = await request.formData();
  const file = form.get("file");
  const documentName = String(form.get("documentName") || "").trim();
  if (!(file instanceof File) || !file.size) return badRequest("Choose a file to upload");
  if (!documentName) return badRequest("Document name is required");
  if (file.size > MAX_BYTES) return badRequest("File is larger than 12 MB");

  const buffer = Buffer.from(await file.arrayBuffer());
  const employee = task.instance.employee;
  const publicId = [
    "smarthr",
    task.instance.companyId || "org",
    employee.employeeCode || employee.id,
    `${slugDocumentName(documentName)}-${Date.now()}`,
  ].join("/");

  try {
    const uploaded = await uploadChecklistFileToCloudinary({
      buffer,
      filename: file.name,
      mimeType: file.type,
      publicId,
    });

    const record = await insertTaskFile({
      taskId: id,
      documentName,
      fileName: file.name,
      fileUrl: uploaded.url,
      publicId: uploaded.publicId,
      fileSize: uploaded.bytes,
      mimeType: file.type || null,
      uploadedById: session.employeeId ?? null,
      uploadedByName: authorName(session),
    });

    if (task.status === "PENDING") {
      await prisma.checklistTask.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      });
    }

    broadcastAppEvent("checklist_updated", { id, action: "document_uploaded" });
    broadcastAppEvent("document_updated", { taskId: id, fileId: record.id });
    revalidatePath("/checklist/todos");
    revalidatePath("/checklist/onboarding");
    revalidatePath("/checklist/offboarding");
    return NextResponse.json(record);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    if (message === "CLOUDINARY_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error:
            "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) return badRequest("fileId is required");

  const task = await prisma.checklistTask.findUnique({
    where: { id },
    include: { instance: true },
  });
  if (!task) return notFound();
  if (!canUploadChecklistDocument(session, task) && !canManageChecklists(session)) {
    return unauthorized();
  }

  const file = await findTaskFile(fileId, id);
  if (!file) return notFound();

  if (file.publicId) await deleteCloudinaryFile(file.publicId);
  await deleteTaskFile(fileId);

  broadcastAppEvent("checklist_updated", { id, action: "document_deleted" });
  revalidatePath("/checklist/todos");
  return NextResponse.json({ success: true });
}
