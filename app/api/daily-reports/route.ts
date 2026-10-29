import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireRoles, unauthorized } from "@/lib/api-auth";
import { DAILY_REPORTING_ROLES } from "@/lib/roles";
import { isDailyReportModelReady, prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { sanitizeReportHtml, parseReportDate } from "@/lib/daily-reporting/content";
import { isDailyReportTemplateId } from "@/lib/daily-reporting/templates";

const REPORT_STATUSES = new Set(["DRAFT", "SUBMITTED"]);

export async function GET(request: NextRequest) {
  const guard = await requireRoles(DAILY_REPORTING_ROLES);
  if (guard.error || !guard.session) return guard.error ?? unauthorized();

  if (!isDailyReportModelReady()) {
    return NextResponse.json(
      { error: "Daily reporting is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.trim();

  const where: Prisma.DailyReportWhereInput = { userId: guard.session.id };
  if (status && REPORT_STATUSES.has(status)) where.status = status;
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ];
  }

  const reports = await prisma.dailyReport.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(reports);
}

export async function POST(request: NextRequest) {
  const guard = await requireRoles(DAILY_REPORTING_ROLES);
  if (guard.error || !guard.session) return guard.error ?? unauthorized();

  if (!isDailyReportModelReady()) {
    return NextResponse.json(
      { error: "Daily reporting is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }

  const companyId = guard.session.companyId ?? null;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? sanitizeReportHtml(body.content) : "";
  const status = typeof body?.status === "string" && REPORT_STATUSES.has(body.status)
    ? body.status
    : "DRAFT";
  const template = isDailyReportTemplateId(body?.template) ? body.template : "blank";
  const reportDate = parseReportDate(body?.reportDate) ?? new Date();

  const report = await prisma.dailyReport.create({
    data: {
      companyId,
      userId: guard.session.id,
      employeeId: guard.session.employeeId ?? null,
      title: title || "Untitled daily report",
      content,
      template,
      status,
      reportDate,
    },
  });

  broadcastAppEvent("daily_report_updated", { id: report.id, action: "created" });
  revalidatePath("/daily-reporting");

  return NextResponse.json(report, { status: 201 });
}
