import { prisma } from "@/lib/prisma";
import {
  ensureDocumentSubfolder,
  ensureEmployeeDocumentFolder,
} from "@/lib/documents/upload-links";

/**
 * A file uploaded from a checklist/To-Do task must also exist as a normal
 * Document record. Otherwise HR and admins only see it inside the task and it
 * never appears in the Documents module or the employee document view.
 *
 * Files land in the employee's folder and the requested-document subfolder,
 * mirroring where a passwordless upload link stores the same document.
 */
export async function recordChecklistTaskDocument(opts: {
  companyId: string | null;
  employeeId: string;
  documentName: string;
  fileName: string;
  fileUrl: string;
  publicId: string | null;
  fileSize: number | null;
  mimeType: string | null;
  storageType: string;
  uploadedById: string | null;
  uploadedByName: string;
}) {
  const author = opts.uploadedByName.trim() || "Smart HR";
  const rootFolder = await ensureEmployeeDocumentFolder({
    companyId: opts.companyId,
    employeeId: opts.employeeId,
    createdByName: author,
  });
  const subfolder = await ensureDocumentSubfolder({
    companyId: opts.companyId,
    employeeId: opts.employeeId,
    parentFolderId: rootFolder.id,
    documentName: opts.documentName,
    createdByName: author,
  });

  return prisma.document.create({
    data: {
      companyId: opts.companyId,
      folderId: subfolder.id,
      employeeId: opts.employeeId,
      title: opts.documentName,
      category: subfolder.name,
      fileUrl: opts.fileUrl,
      fileName: opts.fileName,
      mimeType: opts.mimeType,
      publicId: opts.publicId,
      storageType: opts.storageType,
      fileSize: opts.fileSize,
      uploadedBy: author,
      uploadedById: opts.uploadedById,
      visibility: "PRIVATE",
    },
  });
}

/** Remove the Documents copy of a checklist file, matched by Cloudinary id. */
export async function deleteChecklistTaskDocument(file: {
  publicId: string | null;
  fileName: string;
  fileUrl: string;
  employeeId: string;
}) {
  const linked = file.publicId
    ? await prisma.document.findFirst({
        where: { publicId: file.publicId },
        select: { id: true, folderId: true },
      })
    : await prisma.document.findFirst({
        where: {
          employeeId: file.employeeId,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
        },
        select: { id: true, folderId: true },
      });

  if (!linked) return null;
  await prisma.document.delete({ where: { id: linked.id } });
  return linked;
}
