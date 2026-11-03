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
  const existing = await prisma.document.findFirst({
    where: opts.publicId ? { publicId: opts.publicId } : { fileUrl: opts.fileUrl, employeeId: opts.employeeId },
  });
  if (existing) return existing;

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

/**
 * Repair missing Documents mirrors for To-Do uploads. Older uploads, or an
 * upload whose secondary mirror write failed, still live in ChecklistTaskFile.
 */
export async function syncChecklistTaskDocuments(companyId?: string | null, employeeId?: string) {
  const files = await prisma.checklistTaskFile.findMany({
    where: {
      ...(employeeId || companyId
        ? {
            task: {
              instance: {
                ...(employeeId ? { employeeId } : {}),
                ...(companyId ? { OR: [{ companyId }, { employee: { user: { companyId } } }] } : {}),
              },
            },
          }
        : {}),
    },
    include: {
      task: {
        include: {
          instance: {
            include: {
              employee: {
                select: {
                  id: true,
                  user: { select: { companyId: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!files.length) return;

  const existing = await prisma.document.findMany({
    where: {
      OR: [
        { publicId: { in: files.flatMap((file) => file.publicId ? [file.publicId] : []) } },
        { fileUrl: { in: files.map((file) => file.fileUrl) } },
      ],
    },
    select: { publicId: true, fileUrl: true },
  });
  const existingKeys = new Set(existing.flatMap((document) => [
    ...(document.publicId ? [`id:${document.publicId}`] : []),
    `url:${document.fileUrl}`,
  ]));

  for (const file of files) {
    if ((file.publicId && existingKeys.has(`id:${file.publicId}`)) || existingKeys.has(`url:${file.fileUrl}`)) continue;
    const employee = file.task.instance.employee;
    try {
      const document = await recordChecklistTaskDocument({
        companyId: file.task.instance.companyId ?? employee.user.companyId,
        employeeId: employee.id,
        documentName: file.documentName,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        publicId: file.publicId,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        storageType: file.mimeType?.startsWith("image/") || file.mimeType === "application/pdf" ? "image" : "raw",
        uploadedById: null,
        uploadedByName: file.uploadedByName,
      });
      existingKeys.add(`url:${document.fileUrl}`);
      if (document.publicId) existingKeys.add(`id:${document.publicId}`);
    } catch (error) {
      console.error("Could not repair To-Do document mirror", { fileId: file.id, error });
    }
  }
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
