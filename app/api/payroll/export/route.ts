import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, forbidden } from "@/lib/api-auth";
import {
  canExportPayrollData,
  payrollListWhere,
  payrollRunListWhere,
} from "@/lib/payroll-access";
import {
  mapRecordToExportRow,
  payrollRegisterHtml,
  rowsToCsv,
  rowsToExcelCsv,
} from "@/lib/payroll-export";
import { getAppCurrencyCode } from "@/lib/currency-server";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canExportPayrollData(session)) return forbidden();

  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  const runId = request.nextUrl.searchParams.get("runId");
  const periodStart = request.nextUrl.searchParams.get("periodStart");
  const periodEnd = request.nextUrl.searchParams.get("periodEnd");

  let where: Record<string, unknown> = await payrollListWhere(session);
  if (runId) {
    const runScope = await payrollRunListWhere(session);
    const run = await prisma.payrollRun.findFirst({
      where: { id: runId, ...runScope },
    });
    if (!run) {
      return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
    }
    where = { payrollRunId: runId };
  } else if (periodStart && periodEnd) {
    where = {
      ...where,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    };
  }

  const records = await prisma.payrollRecord.findMany({
    where,
    include: {
      employee: { include: { department: true } },
    },
    orderBy: [{ periodStart: "desc" }, { employee: { firstName: "asc" } }],
  });

  const rows = records.map(mapRecordToExportRow);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "pdf") {
    const currencyCode = await getAppCurrencyCode();
    const html = payrollRegisterHtml(
      runId ? "Payroll register" : "Payroll export",
      rows,
      currencyCode
    );
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="payroll-register-${stamp}.html"`,
      },
    });
  }

  const payload =
    format === "xlsx" || format === "excel"
      ? rowsToExcelCsv(rows as unknown as Record<string, unknown>[])
      : rowsToCsv(rows as unknown as Record<string, unknown>[]);

  const ext = format === "xlsx" || format === "excel" ? "csv" : "csv";
  const mime =
    format === "xlsx" || format === "excel"
      ? "text/csv; charset=utf-8"
      : "text/csv; charset=utf-8";

  return new NextResponse(payload, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="payroll-${stamp}.${ext}"`,
    },
  });
}
