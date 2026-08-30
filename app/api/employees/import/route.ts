import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession, canManageEmployees } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { importDeviceEmployees } from "@/lib/employees/import-from-device";
import { nextEmployeeCode } from "@/lib/employees/next-employee-code";
import {
  parseZktecoEmployeeSheet,
  summarizeImportRows,
} from "@/lib/employees/parse-zkteco-export";

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
  const branchId = typeof form.get("branchId") === "string" ? String(form.get("branchId")) : null;
  const dryRun = form.get("dryRun") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload an .xlsx employee export file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = parseZktecoEmployeeSheet(sheet);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No staff with a device PIN found in this file" },
      { status: 400 }
    );
  }

  const preview = summarizeImportRows(rows);

  if (dryRun) {
    const existing = await prisma.employee.findMany({
      where: { user: { companyId: session.companyId } },
      select: { employeeCode: true },
    });
    const usedCodes = new Set(existing.map((e) => e.employeeCode?.trim()).filter(Boolean));
    const previewRows: Array<{
      pin: string;
      name: string;
      email: string;
      employeeCode: string;
      fromFile: boolean;
    }> = [];
    for (const row of rows) {
      const fromFileCode = row.employeeCode?.trim();
      let employeeCode = fromFileCode;
      let fromFile = Boolean(fromFileCode);
      if (!employeeCode || usedCodes.has(employeeCode)) {
        const generated = await nextEmployeeCode();
        usedCodes.add(generated);
        employeeCode = generated;
        fromFile = false;
      } else {
        usedCodes.add(employeeCode);
      }
      previewRows.push({
        pin: row.pin,
        name: `${row.firstName} ${row.lastName}`.trim(),
        email: row.email?.trim() || "",
        employeeCode,
        fromFile,
      });
    }
    return NextResponse.json({ ok: true, dryRun: true, preview, rows: previewRows });
  }

  const department = await prisma.department.findFirst({
    where: { companyId: session.companyId },
    select: { id: true },
  });
  if (!department) {
    return NextResponse.json({ error: "Create a department first" }, { status: 400 });
  }

  const result = await importDeviceEmployees({
    companyId: session.companyId,
    departmentId: department.id,
    branchId,
    rows,
    updateExistingPin: true,
  });

  return NextResponse.json({
    ok: true,
    preview,
    ...result,
  });
}
