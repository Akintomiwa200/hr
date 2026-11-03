import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { getCloudinaryConfig, deleteCloudinaryFile } from "@/lib/cloudinary";
import { readDirectUploadTicket } from "@/lib/cloudinary-direct-upload";
import { allowedUploadExtension, fetchUploadLinkByToken, recordUploadLinkUpload, uploadLinkState, uploadLinkStateLabel } from "@/lib/documents/upload-links";

type Ticket = { kind: "public-upload-link"; linkId: string; token: string; companyId: string | null; employeeId: string; folderId: string; taskId: string | null; fileName: string; mimeType: string; fileSize: number; publicId: string; resourceType: "image" | "raw"; expiresAt: number };

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const config = getCloudinaryConfig();
  if (!config) return NextResponse.json({ error: "File storage is not configured. Please contact HR." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const ticket = typeof body?.ticket === "string" ? readDirectUploadTicket<Ticket>(body.ticket, config.apiSecret) : null;
  if (!ticket || ticket.kind !== "public-upload-link" || ticket.token !== token) return NextResponse.json({ error: "This upload confirmation is invalid or expired." }, { status: 400 });
  const secureUrl = typeof body?.secure_url === "string" ? body.secure_url : "";
  const publicId = typeof body?.public_id === "string" ? body.public_id : "";
  const resourceType = typeof body?.resource_type === "string" ? body.resource_type : "";
  const bytes = Number(body?.bytes);
  let url: URL;
  try { url = new URL(secureUrl); } catch { return NextResponse.json({ error: "Cloudinary returned an invalid file URL." }, { status: 400 }); }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.pathname.split("/")[1] !== config.cloudName || publicId !== ticket.publicId || resourceType !== ticket.resourceType || bytes !== ticket.fileSize) return NextResponse.json({ error: "The uploaded file did not match the authorized upload." }, { status: 400 });
  const link = await fetchUploadLinkByToken(token);
  if (!link || link.id !== ticket.linkId || link.companyId !== ticket.companyId || link.employeeId !== ticket.employeeId || link.folderId !== ticket.folderId || link.taskId !== ticket.taskId) { await deleteCloudinaryFile(publicId, ticket.resourceType); return NextResponse.json({ error: "The upload link has changed. Request a new upload." }, { status: 410 }); }
  const state = uploadLinkState(link);
  if (state !== "ACTIVE") { await deleteCloudinaryFile(publicId, ticket.resourceType); return NextResponse.json({ error: `This upload link is closed (${uploadLinkStateLabel(state).toLowerCase()}).` }, { status: 410 }); }
  try {
    const uploaderName = `${link.employee.firstName} ${link.employee.lastName}`.trim() || "Employee";
    const { document, checklistFileId } = await recordUploadLinkUpload({ link, employee: link.employee, fileName: ticket.fileName, fileUrl: secureUrl, publicId, fileSize: bytes, mimeType: ticket.mimeType, storageType: ticket.resourceType, uploaderName });
    broadcastAppEvent("document_updated", { id: document.id, folderId: document.folderId });
    broadcastAppEvent("folder_updated", { id: document.folderId, employeeId: link.employeeId, action: "file_added" });
    if (checklistFileId) { broadcastAppEvent("checklist_updated", { id: link.taskId, action: "document_uploaded" }); revalidatePath("/checklist/todos"); revalidatePath("/checklist/onboarding"); revalidatePath("/checklist/offboarding"); }
    revalidatePath("/documents"); revalidatePath(`/documents/${link.folderId}`); if (document.folderId) revalidatePath(`/documents/${document.folderId}`);
    if (link.createdById) try { await createNotification({ userId: link.createdById, type: link.taskId ? "checklist" : "general", title: `Document uploaded: ${link.documentName}`, message: `${uploaderName} uploaded ${ticket.fileName} for ${link.documentName}.`, href: link.taskId ? `/checklist/tasks/${link.taskId}` : `/documents/${link.folderId}` }); } catch (error) { console.error("Could not notify upload link creator", error); }
    const refreshed = await prisma.documentUploadLink.findUnique({ where: { id: link.id }, select: { uploadCount: true, maxUploads: true } });
    return NextResponse.json({ id: document.id, fileName: document.fileName, documentName: link.documentName, folderPath: [link.folder.name, link.subfolder?.name ?? link.documentName].join(" / "), remainingUploads: refreshed ? Math.max(0, refreshed.maxUploads - refreshed.uploadCount) : 0, uploadedAt: document.createdAt, extension: allowedUploadExtension(ticket.fileName) });
  } catch (error) {
    await deleteCloudinaryFile(publicId, ticket.resourceType);
    console.error("Public upload link save failed", error);
    return NextResponse.json({ error: "The file uploaded, but it could not be filed. Please try again or contact HR." }, { status: 500 });
  }
}
