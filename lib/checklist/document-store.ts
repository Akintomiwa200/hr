import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDocumentNames } from "@/lib/checklist/documents";

export type ChecklistTaskFileRow = {
  id: string;
  taskId: string;
  documentName: string;
  fileName: string;
  fileUrl: string;
  publicId: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedById: string | null;
  uploadedByName: string;
  createdAt: Date;
};

export async function setTemplateTaskRequiredDocuments(
  templateId: string,
  title: string,
  docs: string[]
) {
  await prisma.$executeRaw`
    UPDATE "ChecklistTemplateTask"
    SET "taskType" = ${docs.length ? "DOCUMENT" : "CHECKBOX"},
        "requiredDocuments" = CAST(${JSON.stringify(docs)} AS jsonb)
    WHERE "templateId" = ${templateId} AND "title" = ${title}
  `;
}

export async function setTasksRequiredDocumentsByTitle(title: string, docs: string[]) {
  await prisma.$executeRaw`
    UPDATE "ChecklistTask"
    SET "taskType" = ${docs.length ? "DOCUMENT" : "CHECKBOX"},
        "requiredDocuments" = CAST(${JSON.stringify(docs)} AS jsonb)
    WHERE "title" = ${title}
  `;
}

export async function setTaskRequiredDocumentsById(
  taskId: string,
  docs: string[],
  taskType?: string
) {
  await prisma.$executeRaw`
    UPDATE "ChecklistTask"
    SET "taskType" = ${taskType ?? (docs.length ? "DOCUMENT" : "CHECKBOX")},
        "requiredDocuments" = CAST(${JSON.stringify(docs)} AS jsonb)
    WHERE "id" = ${taskId}
  `;
}

export async function setTemplateTaskRequiredDocumentsById(taskId: string, docs: string[]) {
  await prisma.$executeRaw`
    UPDATE "ChecklistTemplateTask"
    SET "taskType" = ${docs.length ? "DOCUMENT" : "CHECKBOX"},
        "requiredDocuments" = CAST(${JSON.stringify(docs)} AS jsonb)
    WHERE "id" = ${taskId}
  `;
}

export async function fetchTaskRequiredDocuments(taskId: string) {
  const rows = await prisma.$queryRaw<Array<{ requiredDocuments: unknown }>>`
    SELECT "requiredDocuments" FROM "ChecklistTask" WHERE "id" = ${taskId}
  `;
  return parseDocumentNames(rows[0]?.requiredDocuments);
}

export async function fetchTaskRequiredDocumentsMap(taskIds: string[]) {
  const map = new Map<string, string[]>();
  if (taskIds.length === 0) return map;
  const rows = await prisma.$queryRaw<Array<{ id: string; requiredDocuments: unknown }>>`
    SELECT "id", "requiredDocuments" FROM "ChecklistTask" WHERE "id" IN (${Prisma.join(taskIds)})
  `;
  for (const row of rows) {
    map.set(row.id, parseDocumentNames(row.requiredDocuments));
  }
  return map;
}

export async function fetchTemplateTaskRequiredDocumentsMap(templateId: string) {
  const map = new Map<string, string[]>();
  const rows = await prisma.$queryRaw<Array<{ id: string; requiredDocuments: unknown }>>`
    SELECT "id", "requiredDocuments" FROM "ChecklistTemplateTask" WHERE "templateId" = ${templateId}
  `;
  for (const row of rows) {
    map.set(row.id, parseDocumentNames(row.requiredDocuments));
  }
  return map;
}

export async function fetchTaskFiles(taskId: string): Promise<ChecklistTaskFileRow[]> {
  return prisma.$queryRaw<ChecklistTaskFileRow[]>`
    SELECT "id", "taskId", "documentName", "fileName", "fileUrl", "publicId",
           "fileSize", "mimeType", "uploadedById", "uploadedByName", "createdAt"
    FROM "ChecklistTaskFile"
    WHERE "taskId" = ${taskId}
    ORDER BY "createdAt" ASC
  `;
}

export async function fetchTaskFilesMap(taskIds: string[]) {
  const map = new Map<string, ChecklistTaskFileRow[]>();
  if (taskIds.length === 0) return map;
  const rows = await prisma.$queryRaw<ChecklistTaskFileRow[]>`
    SELECT "id", "taskId", "documentName", "fileName", "fileUrl", "publicId",
           "fileSize", "mimeType", "uploadedById", "uploadedByName", "createdAt"
    FROM "ChecklistTaskFile"
    WHERE "taskId" IN (${Prisma.join(taskIds)})
    ORDER BY "createdAt" ASC
  `;
  for (const row of rows) {
    const list = map.get(row.taskId) ?? [];
    list.push(row);
    map.set(row.taskId, list);
  }
  return map;
}

export async function fetchTaskFileSummariesMap(taskIds: string[]) {
  const files = await fetchTaskFilesMap(taskIds);
  const map = new Map<string, Array<{ id: string; documentName: string }>>();
  for (const [taskId, rows] of files) {
    map.set(
      taskId,
      rows.map((file) => ({ id: file.id, documentName: file.documentName }))
    );
  }
  return map;
}

export async function insertTaskFile(data: {
  taskId: string;
  documentName: string;
  fileName: string;
  fileUrl: string;
  publicId: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedById: string | null;
  uploadedByName: string;
}): Promise<ChecklistTaskFileRow> {
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "ChecklistTaskFile"
      ("id","taskId","documentName","fileName","fileUrl","publicId","fileSize","mimeType","uploadedById","uploadedByName","createdAt")
    VALUES (
      ${id},
      ${data.taskId},
      ${data.documentName},
      ${data.fileName},
      ${data.fileUrl},
      ${data.publicId},
      ${data.fileSize},
      ${data.mimeType},
      ${data.uploadedById},
      ${data.uploadedByName},
      CURRENT_TIMESTAMP
    )
  `;
  const rows = await prisma.$queryRaw<ChecklistTaskFileRow[]>`
    SELECT "id", "taskId", "documentName", "fileName", "fileUrl", "publicId",
           "fileSize", "mimeType", "uploadedById", "uploadedByName", "createdAt"
    FROM "ChecklistTaskFile" WHERE "id" = ${id}
  `;
  if (!rows[0]) {
    throw new Error("Failed to save uploaded document");
  }
  return rows[0];
}

export async function findTaskFile(fileId: string, taskId: string) {
  const rows = await prisma.$queryRaw<ChecklistTaskFileRow[]>`
    SELECT "id", "taskId", "documentName", "fileName", "fileUrl", "publicId",
           "fileSize", "mimeType", "uploadedById", "uploadedByName", "createdAt"
    FROM "ChecklistTaskFile"
    WHERE "id" = ${fileId} AND "taskId" = ${taskId}
  `;
  return rows[0] ?? null;
}

export async function deleteTaskFile(fileId: string) {
  await prisma.$executeRaw`DELETE FROM "ChecklistTaskFile" WHERE "id" = ${fileId}`;
}

export async function hydrateChecklistTasks<T extends { id: string }>(tasks: T[]) {
  const ids = tasks.map((task) => task.id);
  const [docs, files] = await Promise.all([
    fetchTaskRequiredDocumentsMap(ids),
    fetchTaskFilesMap(ids),
  ]);
  return tasks.map((task) => ({
    ...task,
    requiredDocuments: docs.get(task.id) ?? [],
    files: files.get(task.id) ?? [],
  }));
}
