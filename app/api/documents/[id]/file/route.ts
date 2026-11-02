import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-auth";
import { canViewDocument } from "@/lib/documents/access";
import { isSuperAdmin } from "@/lib/roles";
import bcrypt from "bcryptjs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  return serveDocument(request, id, session, null);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";
  return serveDocument(request, id, session, pin);
}

async function serveDocument(request: NextRequest, id: string, session: NonNullable<Awaited<ReturnType<typeof requireSession>>>, pin: string | null) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: { folder: true },
  });
  if (!document || !document.fileUrl) return notFound();
  if (!isSuperAdmin(session.role) && document.companyId !== session.companyId) return notFound();

  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
      })
    : null;
  if (!canViewDocument(session, document, employee, document.folder)) return forbidden();
  if (document.visibility === "PROTECTED") {
    if (pin === null) return NextResponse.json({ error: "Enter the document PIN or password to open this file." }, { status: 428 });
    if (!document.protectionHash || !(await bcrypt.compare(pin, document.protectionHash))) {
      return NextResponse.json({ error: "That PIN or password is incorrect." }, { status: 403 });
    }
  } else if (pin !== null) {
    return badRequest("This file is not password protected.");
  }

  let source: URL;
  try {
    source = new URL(document.fileUrl);
  } catch {
    return notFound();
  }
  if (source.protocol !== "https:" || !source.hostname.endsWith(".cloudinary.com")) return notFound();

  const upstream = await fetch(source, { signal: request.signal });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "The file is unavailable." }, { status: 502 });
  const safeName = (document.fileName ?? document.title).replace(/[\r\n"\\]/g, "_");
  return new Response(upstream.body, {
    headers: {
      "Content-Type": document.mimeType || upstream.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(document.fileName ?? document.title)}`,
      "Cache-Control": "private, no-store",
      ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
    },
  });
}
