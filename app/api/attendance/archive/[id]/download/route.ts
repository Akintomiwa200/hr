import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireSession, unauthorized } from "@/lib/api-auth";
import { normalizeRole } from "@/lib/roles";

function isAdmin(session: { role: string }) {
  const role = normalizeRole(session.role);
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "HR";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();
  if (!session.companyId) return forbidden();
  const { id } = await params;

  const archive = await prisma.attendanceArchive.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!archive) {
    return NextResponse.json({ error: "Archive not found" }, { status: 404 });
  }

  const res = await fetch(archive.fileUrl);
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: "Failed to fetch archive from storage" }, { status: 502 });
  }

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const name = `attendance-${archive.month}.json`;

  return new NextResponse(res.body as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
