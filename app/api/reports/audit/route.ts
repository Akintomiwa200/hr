import { NextRequest, NextResponse } from "next/server";
import { requireSession, forbidden, unauthorized } from "@/lib/api-auth";
import { canViewOrgReports } from "@/lib/reports/access";
import {
  auditActions,
  auditModules,
  auditSummary,
  listAuditLogs,
} from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canViewOrgReports(session)) return forbidden();

  const { searchParams } = request.nextUrl;
  const moduleName = searchParams.get("module") ?? undefined;
  const action = searchParams.get("action") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Number(searchParams.get("limit") ?? 100);

  const filter = {
    companyId: session.companyId,
    module: moduleName || undefined,
    action: action || undefined,
    search: search || undefined,
    from: from && !Number.isNaN(Date.parse(from)) ? new Date(from) : undefined,
    to: to && !Number.isNaN(Date.parse(to)) ? new Date(to) : undefined,
    limit: Number.isFinite(limit) ? limit : 100,
  };

  const [rows, summary] = await Promise.all([
    listAuditLogs(filter),
    auditSummary(filter),
  ]);

  return NextResponse.json({
    rows,
    summary,
    modules: auditModules,
    actions: auditActions,
  });
}