import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { notFound, requireRoles, unauthorized } from "@/lib/api-auth";
import { DAILY_REPORTING_ROLES } from "@/lib/roles";
import { isDailyReportModelReady, prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isDailyReportTemplateId } from "@/lib/daily-reporting/templates";

export async function POST(
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

  const companyId = guard.session.companyId ?? null;

  const { id } = await params;
  const original = await prisma.dailyReport.findUnique({ where: { id } });
  if (!original || original.userId !== guard.session.id) return notFound();

  const copy = await prisma.dailyReport.create({
    data: {
      companyId,
      userId: guard.session.id,
      employeeId: guard.session.employeeId ?? null,
      title: `${original.title} (copy)`.slice(0, 180),
      content: original.content,
      template: isDailyReportTemplateId(original.template) ? original.template : "blank",
      status: "DRAFT",
      reportDate: new Date(),
    },
  });

  broadcastAppEvent("daily_report_updated", { id: copy.id, action: "created" });
  revalidatePath("/daily-reporting");

  return NextResponse.json(copy, { status: 201 });
}
