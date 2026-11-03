import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-auth";
import { canManageDocuments } from "@/lib/documents/access";
import { deleteCloudinaryFile, getCloudinaryConfig } from "@/lib/cloudinary";
import { readDirectUploadTicket } from "@/lib/cloudinary-direct-upload";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

type DocumentTicket = {
  kind: "document";
  companyId: string | null;
  folderId: string | null;
  employeeId: string | null;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  visibility: string;
  protectionHash: string | null;
  category: string;
  publicId: string;
  resourceType: "image" | "raw";
  uploaderId: string;
  uploaderName: string;
  expiresAt: number;
};

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManageDocuments(session)) return unauthorized();
  const body = await request.json().catch(() => null);
  const config = getCloudinaryConfig();
  if (!config) return NextResponse.json({ error: "Cloudinary is not configured on the server." }, { status: 503 });
  const ticket = typeof body?.ticket === "string" ? readDirectUploadTicket<DocumentTicket>(body.ticket, config.apiSecret) : null;
  if (!ticket || ticket.kind !== "document" || ticket.uploaderId !== session.id || ticket.companyId !== session.companyId) {
    return NextResponse.json({ error: "This upload confirmation is invalid or expired. Please upload the file again." }, { status: 400 });
  }

  const secureUrl = typeof body?.secure_url === "string" ? body.secure_url : "";
  const publicId = typeof body?.public_id === "string" ? body.public_id : "";
  const resourceType = typeof body?.resource_type === "string" ? body.resource_type : "";
  const bytes = Number(body?.bytes);
  let uploadedUrl: URL;
  try { uploadedUrl = new URL(secureUrl); } catch { return NextResponse.json({ error: "Cloudinary returned an invalid file URL." }, { status: 400 }); }
  if (uploadedUrl.protocol !== "https:" || uploadedUrl.hostname !== "res.cloudinary.com" || uploadedUrl.pathname.split("/")[1] !== config.cloudName || publicId !== ticket.publicId || resourceType !== ticket.resourceType || bytes !== ticket.fileSize) {
    return NextResponse.json({ error: "The uploaded file did not match the authorized upload." }, { status: 400 });
  }
  const existing = await prisma.document.findFirst({ where: { publicId }, select: { id: true, fileName: true } });
  if (existing) return NextResponse.json({ id: existing.id, fileName: existing.fileName, alreadySaved: true });

  let document;
  try {
    document = await prisma.document.create({
      data: {
        companyId: ticket.companyId,
        folderId: ticket.folderId,
        employeeId: ticket.employeeId,
        title: ticket.title,
        category: ticket.category,
        fileUrl: secureUrl,
        fileName: ticket.fileName,
        mimeType: ticket.mimeType,
        publicId,
        storageType: ticket.resourceType,
        fileSize: bytes,
        visibility: ticket.visibility,
        protectionHash: ticket.protectionHash,
        uploadedBy: ticket.uploaderName,
        uploadedById: session.id,
      },
      select: { id: true, title: true, fileName: true, folderId: true },
    });
  } catch (error) {
    await deleteCloudinaryFile(publicId, ticket.resourceType);
    console.error("Document metadata save failed after direct upload", error);
    return NextResponse.json({ error: "The file uploaded, but its document record could not be saved." }, { status: 500 });
  }
  broadcastAppEvent("document_updated", { id: document.id, folderId: document.folderId });
  if (document.folderId) broadcastAppEvent("folder_updated", { id: document.folderId, action: "file_added" });
  revalidatePath("/documents");
  if (document.folderId) revalidatePath(`/documents/${document.folderId}`);
  return NextResponse.json({ id: document.id, title: document.title, fileName: document.fileName });
}
