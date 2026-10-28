import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { notFound, requireRoles, unauthorized } from "@/lib/api-auth";
import { DAILY_REPORTING_ROLES } from "@/lib/roles";
import { isDailyReportModelReady, prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { sanitizeReportHtml, parseReportDate } from "@/lib/daily-reporting/content";
import { isDailyReportTemplateId } from "@/lib/daily-reporting/templates";

const REPORT_STATUSES = new Set(["DRAFT", "SUBMITTED"]);

async function loadOwnedReport(id: string, userId: string) {
  const report = await prisma.dailyReport.findUnique({ where: { id } });
  if (!report || report.userId !== userId) return null;
  return report;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRoles(DAILY_REPORTING_ROLES);
  if (guard.error || !guard.session) return guard.error ?? unauthorized();

  if (!isDailyReportModelReady()) {
    return NextResponse.json(
      { error: "Daily reporting is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const report = await loadOwnedReport(id, guard.session.id);
  if (!report) return notFound();

  return NextResponse.json(report);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRoles(DAILY_REPORTING_ROLES);
  if (guard.error || !guard.session) return guard.error ?? unauthorized();

  if (!isDailyReportModelReady()) {
    return NextResponse.json(
      { error: "Daily reporting is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const existing = await loadOwnedReport(id, guard.session.id);
  if (!existing) return notFound();

  const body = await request.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.title === "string") {
    data.title = body.title.trim() || "Untitled daily report";
  }
  if (typeof body?.content === "string") {
    data.content = sanitizeReportHtml(body.content);
  }
  if (typeof body?.status === "string" && REPORT_STATUSES.has(body.status)) {
    data.status = body.status;
  }
  if (body?.template === "blank") {
    data.template = "blank";
  } else if (isDailyReportTemplateId(body?.template)) {
    data.template = body.template;
  }
  if (body?.reportDate !== undefined) {
    const reportDate = parseReportDate(body.reportDate);
    if (reportDate) data.reportDate = reportDate;
  }

  const report = await prisma.dailyReport.update({ where: { id }, data });

  broadcastAppEvent("daily_report_updated", { id, action: "updated" });
  revalidatePath("/daily-reporting");
  revalidatePath(`/daily-reporting/${id}`);

  return NextResponse.json(report);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRoles(DAILY_REPORTING_ROLES);
  if (guard.error || !guard.session) return guard.error ?? unauthorized();

  if (!isDailyReportModelReady()) {
    return NextResponse.json(
      { error: "Daily reporting is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const existing = await loadOwnedReport(id, guard.session.id);
  if (!existing) return notFound();

  await prisma.dailyReport.delete({ where: { id } });

  broadcastAppEvent("daily_report_updated", { id, action: "deleted" });
  revalidatePath("/daily-reporting");

  return NextResponse.json({ success: true });
}
