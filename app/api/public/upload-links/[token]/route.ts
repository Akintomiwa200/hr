import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { deleteCloudinaryFile, uploadToCloudinary } from "@/lib/cloudinary";
import {
  UPLOAD_LINK_MAX_BYTES,
  allowedUploadExtension,
  cloudinaryUploadPath,
  fetchUploadLinkByToken,
  isAllowedUploadFile,
  recordUploadLinkUpload,
  uploadLinkState,
  uploadLinkStateLabel,
} from "@/lib/documents/upload-links";

function publicLinkPayload(link: NonNullable<Awaited<ReturnType<typeof fetchUploadLinkByToken>>>) {
  const state = uploadLinkState(link);
  return {
    documentName: link.documentName,
    employeeName: `${link.employee.firstName} ${link.employee.lastName}`.trim(),
    employeeCode: link.employee.employeeCode,
    companyName: link.company?.name ?? "Smart HR",
    folderName: link.folder.name,
    subfolderName: link.subfolder?.name ?? link.documentName,
    folderPath: [link.folder.name, link.subfolder?.name ?? link.documentName].join(" / "),
    taskTitle: link.task?.title ?? null,
    state,
    stateLabel: uploadLinkStateLabel(state),
    expiresAt: link.expiresAt,
    maxUploads: link.maxUploads,
    uploadCount: link.uploadCount,
    remainingUploads: Math.max(0, link.maxUploads - link.uploadCount),
    lastUsedAt: link.lastUsedAt,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const link = await fetchUploadLinkByToken(token);
  if (!link) {
    return NextResponse.json({ error: "This upload link does not exist." }, { status: 404 });
  }
  return NextResponse.json(publicLinkPayload(link));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const link = await fetchUploadLinkByToken(token);
  if (!link) {
    return NextResponse.json({ error: "This upload link does not exist." }, { status: 404 });
  }

  const state = uploadLinkState(link);
  if (state !== "ACTIVE") {
    return NextResponse.json(
      { error: `This upload link is no longer accepting files (${uploadLinkStateLabel(state).toLowerCase()}).` },
      { status: 410 }
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > UPLOAD_LINK_MAX_BYTES) {
    return NextResponse.json({ error: "Files must be 20 MB or smaller." }, { status: 400 });
  }
  const fileName = file.name.trim();
  if (!fileName || !isAllowedUploadFile(fileName)) {
    return NextResponse.json(
      { error: "Use a PDF, Office, OpenDocument, CSV, text, or image file." },
      { status: 400 }
    );
  }

  let uploaded: Awaited<ReturnType<typeof uploadToCloudinary>>;
  try {
    uploaded = await uploadToCloudinary({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: fileName,
      mimeType: file.type || "application/octet-stream",
      publicId: cloudinaryUploadPath({
        companyId: link.companyId,
        employee: link.employee,
        employeeName: `${link.employee.firstName} ${link.employee.lastName}`,
        documentName: link.documentName,
        fileName,
      }),
      resourceType: "auto",
    });
  } catch (error) {
    const notConfigured = error instanceof Error && error.message === "CLOUDINARY_NOT_CONFIGURED";
    return NextResponse.json(
      {
        error: notConfigured
          ? "File storage is not configured. Please contact HR."
          : "The file could not be uploaded. Please try again.",
      },
      { status: notConfigured ? 503 : 502 }
    );
  }

  try {
    const uploaderName = `${link.employee.firstName} ${link.employee.lastName}`.trim() || "Employee";
    const { document, checklistFileId } = await recordUploadLinkUpload({
      link,
      employee: link.employee,
      fileName,
      fileUrl: uploaded.url,
      publicId: uploaded.publicId,
      fileSize: uploaded.bytes,
      mimeType: file.type || "application/octet-stream",
      storageType: uploaded.resourceType,
      uploaderName,
    });

    broadcastAppEvent("document_updated", { id: document.id, folderId: document.folderId });
    broadcastAppEvent("folder_updated", {
      id: document.folderId,
      employeeId: link.employeeId,
      action: "file_added",
    });
    if (checklistFileId) {
      broadcastAppEvent("checklist_updated", { id: link.taskId, action: "document_uploaded" });
      revalidatePath("/checklist/todos");
      revalidatePath("/checklist/onboarding");
      revalidatePath("/checklist/offboarding");
    }
    revalidatePath("/documents");
    revalidatePath(`/documents/${link.folderId}`);
    if (document.folderId) revalidatePath(`/documents/${document.folderId}`);

    const refreshed = await prisma.documentUploadLink.findUnique({
      where: { id: link.id },
      select: { uploadCount: true, maxUploads: true },
    });

    return NextResponse.json({
      id: document.id,
      fileName: document.fileName,
      documentName: link.documentName,
      folderPath: [link.folder.name, link.subfolder?.name ?? link.documentName].join(" / "),
      remainingUploads: refreshed ? Math.max(0, refreshed.maxUploads - refreshed.uploadCount) : 0,
      uploadedAt: document.createdAt,
      extension: allowedUploadExtension(fileName),
    });
  } catch (error) {
    if (uploaded.resourceType === "image" || uploaded.resourceType === "raw") {
      await deleteCloudinaryFile(uploaded.publicId, uploaded.resourceType);
    }
    console.error("Public upload link save failed", error);
    return NextResponse.json(
      { error: "The file uploaded, but it could not be filed. Please try again or contact HR." },
      { status: 500 }
    );
  }
}
