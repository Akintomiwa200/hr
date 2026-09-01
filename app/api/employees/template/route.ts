import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCompanyScope } from "@/lib/company-scope";
import { hasRole, PEOPLE_ADMIN_ROLES } from "@/lib/roles";
import { buildEmployeeImportWorkbook } from "@/lib/employees/import-template";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(session.role, PEOPLE_ADMIN_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = getCompanyScope(session);
  const buffer = await buildEmployeeImportWorkbook({ companyId: scope.companyId });

  const filename = `employee-import-template-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
