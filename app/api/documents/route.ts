import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { OR: [{ employeeId: null }, { employeeId: session.employeeId }] }
      : {};

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { title, category, fileUrl, employeeId } = await request.json();
  if (!title?.trim() || !category?.trim()) {
    return badRequest("Title and category are required");
  }

  const author = `${session.firstName ?? "User"} ${session.lastName ?? ""}`.trim();

  const document = await prisma.document.create({
    data: {
      title: title.trim(),
      category: category.trim(),
      fileUrl: fileUrl?.trim() || null,
      employeeId: employeeId || null,
      uploadedBy: author,
    },
    include: { employee: true },
  });

  broadcastEvent("document_updated", { id: document.id });
  revalidatePath("/documents");
  return NextResponse.json(document);
}
