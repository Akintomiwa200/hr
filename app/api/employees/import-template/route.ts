import { NextRequest, NextResponse } from "next/server";
import { getSession, canManageEmployees } from "@/lib/auth";
import {
  importEmployeesFromTemplate,
  parseEmployeeImportWorkbook,
} from "@/lib/employees/import-template";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !canManageEmployees(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const dryRun = form.get("dryRun") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload the employee template file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseEmployeeImportWorkbook(buffer);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No employee rows found in this file" },
      { status: 400 }
    );
  }

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, count: rows.length, rows });
  }

  const result = await importEmployeesFromTemplate(
    { companyId: session.companyId },
    rows
  );

  return NextResponse.json({ ok: true, ...result });
}
