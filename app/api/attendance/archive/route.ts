import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { normalizeRole } from "@/lib/roles";
import {
  archiveAttendanceMonth,
  listAttendanceArchives,
  isCloudinaryConfigured,
} from "@/lib/attendance-archive";

function isAdmin(session: { role: string }) {
  const role = normalizeRole(session.role);
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "HR";
}

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();
  if (!session.companyId) return forbidden();

  const archives = await listAttendanceArchives(session.companyId);
  return NextResponse.json({ archives, cloudinaryConfigured: await isCloudinaryConfigured() });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();
  if (!session.companyId) return forbidden();

  if (!(await isCloudinaryConfigured())) {
    return NextResponse.json(
      {
        error:
          "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      },
      { status: 503 }
    );
  }

  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  let year = prev.getUTCFullYear();
  let month = prev.getUTCMonth() + 1;

  try {
    const body = await request.json();
    if (body?.year) year = Number(body.year);
    if (body?.month) month = Number(body.month);
  } catch {
    // no body — default to previous month
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return badRequest("Valid year and month are required");
  }

  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const target = `${year}-${String(month).padStart(2, "0")}`;
  if (target >= currentMonth) {
    return badRequest(
      "The current month cannot be archived yet. Archive months that are already closed."
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { slug: true },
  });

  try {
    const record = await archiveAttendanceMonth({
      companyId: session.companyId,
      companySlug: company?.slug,
      year,
      month,
      createdBy: `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim() || session.email,
    });
    return NextResponse.json({ success: true, archive: record });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "MONTH_ALREADY_ARCHIVED") {
      return NextResponse.json({ error: "This month is already archived" }, { status: 409 });
    }
    if (message === "MONTH_EMPTY") {
      return NextResponse.json({ error: "No attendance records found for that month" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
