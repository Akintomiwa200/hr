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
  const page = Number(request.nextUrl.searchParams.get("previewPage"));
  return serveDocument(request, id, session, null, request.nextUrl.searchParams.get("inline") === "1", Number.isInteger(page) && page > 0 && page <= 500 ? page : null);
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
  const page = Number(body?.previewPage);
  return serveDocument(request, id, session, pin, true, Number.isInteger(page) && page > 0 && page <= 500 ? page : null);
}

function cloudinaryPdfPageUrl(source: URL, page: number) {
  const marker = "/image/upload/";
  const uploadIndex = source.pathname.indexOf(marker);
  if (uploadIndex < 0 || !/\.pdf$/i.test(source.pathname)) return null;
  const prefix = source.pathname.slice(0, uploadIndex + marker.length);
  const assetPath = source.pathname.slice(uploadIndex + marker.length).replace(/\.pdf$/i, ".jpg");
  const transformed = new URL(source);
  transformed.pathname = `${prefix}pg_${page},f_jpg,w_1600,q_auto/${assetPath}`;
  transformed.search = "";
  return transformed;
}

async function serveDocument(request: NextRequest, id: string, session: NonNullable<Awaited<ReturnType<typeof requireSession>>>, pin: string | null, inline = false, previewPage: number | null = null) {
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

  const isPdf = document.mimeType?.toLowerCase() === "application/pdf" || document.fileName?.toLowerCase().endsWith(".pdf");
  const pdfPageSource = previewPage && isPdf
    ? cloudinaryPdfPageUrl(source, previewPage)
    : null;
  if (previewPage && isPdf && !pdfPageSource) {
    return NextResponse.json({ error: "This PDF is not stored as a transformable Cloudinary image. Re-upload it as a PDF image asset to preview pages." }, { status: 415 });
  }
  const upstream = await fetch(pdfPageSource ?? source, { signal: request.signal });
  if (!upstream.ok || !upstream.body) {
    if (pdfPageSource) {
      console.error("Cloudinary PDF page preview failed", { status: upstream.status, page: previewPage, cloud: source.hostname });
      return NextResponse.json({ error: `Cloudinary could not render PDF page ${previewPage} (HTTP ${upstream.status}).` }, { status: 502 });
    }
    return NextResponse.json({ error: "The file is unavailable." }, { status: 502 });
  }
  const safeName = (document.fileName ?? document.title).replace(/[\r\n"\\]/g, "_");
  return new Response(upstream.body, {
    headers: {
      "Content-Type": pdfPageSource ? "image/jpeg" : document.mimeType || upstream.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `${pdfPageSource || inline && (isPdf || document.mimeType?.startsWith("image/")) ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(document.fileName ?? document.title)}`,
      "Cache-Control": "private, no-store",
      ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
    },
  });
}
