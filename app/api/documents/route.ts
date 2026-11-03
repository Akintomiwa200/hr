import { NextRequest, NextResponse } from "next/server";
import { DIRECT_UPLOAD_EXTENSIONS, DIRECT_UPLOAD_MAX_BYTES } from "@/lib/cloudinary-direct-upload";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageDocuments, canViewDocument } from "@/lib/documents/access";
import { deleteCloudinaryFile, uploadToCloudinary } from "@/lib/cloudinary";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

async function getEmployeeContext(session: NonNullable<Awaited<ReturnType<typeof requireSession>>>) {
  if (!session.employeeId) return null;
  return prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
  });
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageDocuments(session)) return unauthorized();

  const folderId = request.nextUrl.searchParams.get("folderId");
  const employee = await getEmployeeContext(session);
  const whereClause = folderId
    ? { folderId }
    : session.role === "EMPLOYEE" && session.employeeId
      ? { OR: [{ employeeId: null }, { employeeId: session.employeeId }] }
      : {};

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: { employee: true, folder: true },
    orderBy: { createdAt: "desc" },
  });

  const visible = documents.filter((d) => canViewDocument(session, d, employee, d.folder));

  return NextResponse.json(visible.map((d) => ({
    ...d,
    fileUrl: d.publicId ? `/api/documents/${d.id}/file` : d.fileUrl,
    protectionHash: undefined,
  })));
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManageDocuments(session)) return unauthorized();

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest("Select a file to upload.");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return badRequest("Select a file to upload.");
  if (file.size > DIRECT_UPLOAD_MAX_BYTES) return badRequest("Files must be 100 MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!DIRECT_UPLOAD_EXTENSIONS.has(extension)) return badRequest("This file format is not supported.");
  const fileName = file.name.trim();
  const titleInput = form.get("title");
  const title = typeof titleInput === "string" && titleInput.trim() ? titleInput.trim() : fileName;
  const folderIdInput = form.get("folderId");
  const folderId = typeof folderIdInput === "string" && folderIdInput.trim() ? folderIdInput.trim() : null;
  const employeeIdInput = form.get("employeeId");
  let employeeId = typeof employeeIdInput === "string" && employeeIdInput.trim() ? employeeIdInput.trim() : null;
  const visibilityInput = form.get("visibility");
  const visibility = visibilityInput === "PUBLIC" || visibilityInput === "PROTECTED" ? visibilityInput : "PRIVATE";
  const protectionPin = form.get("protectionPin");
  if (visibility === "PROTECTED" && (typeof protectionPin !== "string" || protectionPin.length < 4 || protectionPin.length > 128)) {
    return badRequest("Protected files need a PIN or password between 4 and 128 characters.");
  }

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const author = `${session.firstName ?? "User"} ${session.lastName ?? ""}`.trim();

  let folder: { id: string; name: string; employeeId: string | null } | null = null;
  if (folderId) {
    folder = await prisma.documentFolder.findFirst({
      where: { id: folderId, companyId },
      select: { id: true, name: true, employeeId: true },
    });
    if (!folder) return badRequest("Folder not found");
    // Files uploaded into an employee's folder belong to that employee even
    // when the uploader leaves the employee picker empty. Without this the
    // file is missing from HR's employee document view.
    if (!employeeId && folder.employeeId) employeeId = folder.employeeId;
  }
  if (employeeId) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, user: { companyId } }, select: { id: true } });
    if (!employee) return badRequest("Choose an employee from your company.");
  }

  let uploaded: Awaited<ReturnType<typeof uploadToCloudinary>>;
  try {
    uploaded = await uploadToCloudinary({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: fileName,
      mimeType: file.type || "application/octet-stream",
      publicId: `smarthr/documents/${companyId}/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      resourceType: "auto",
    });
  } catch (error) {
    const message = error instanceof Error && error.message === "CLOUDINARY_NOT_CONFIGURED"
      ? "File storage is not configured. Contact your administrator."
      : "The file could not be uploaded. Please try again.";
    return NextResponse.json({ error: message }, { status: error instanceof Error && error.message === "CLOUDINARY_NOT_CONFIGURED" ? 503 : 502 });
  }

  let document;
  try {
    document = await prisma.document.create({
      data: {
        title: title.trim(),
        category: folder?.name ?? "General",
        fileUrl: uploaded.url,
        fileName,
        mimeType: file.type || "application/octet-stream",
        publicId: uploaded.publicId,
        storageType: uploaded.resourceType,
        fileSize: uploaded.bytes,
        employeeId,
        folderId,
        visibility,
        companyId,
        uploadedBy: author,
        uploadedById: session.id,
        protectionHash: visibility === "PROTECTED" ? await bcrypt.hash(protectionPin as string, 10) : null,
      },
      include: { employee: true, folder: true },
    });
  } catch (error) {
    if (uploaded.resourceType === "image" || uploaded.resourceType === "raw") {
      await deleteCloudinaryFile(uploaded.publicId, uploaded.resourceType);
    }
    console.error("Document metadata save failed after file upload", error);
    return NextResponse.json({ error: "The file uploaded, but its document record could not be saved. Check the selected employee and try again." }, { status: 500 });
  }

  broadcastAppEvent("document_updated", { id: document.id, folderId: document.folderId });
  if (folderId) broadcastAppEvent("folder_updated", { id: folderId, action: "file_added" });
  revalidatePath("/documents");
  if (folderId) revalidatePath(`/documents/${folderId}`);
  return NextResponse.json({ id: document.id, title: document.title, fileName: document.fileName, visibility: document.visibility });
}
