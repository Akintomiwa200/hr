import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { canManageEmployee } from "@/lib/employee-access";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { startEmployeeOffboarding } from "@/lib/checklist/instantiate";
import { notifyEmployeeChange } from "@/lib/employees/mutations";
import { prisma } from "@/lib/prisma";
import { parseLocalDate } from "@/lib/dates";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !(await canManageEmployee(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const deactivate = body.deactivate !== false; // default: remove access
  const endDate = parseLocalDate(body.endDate) ?? new Date();

  const companyId = requireOrgCompanyId(getCompanyScope(session));

  try {
    const result = await startEmployeeOffboarding({
      employeeId: id,
      companyId,
      deactivate,
      endDate,
    });

    notifyEmployeeChange(id, deactivate ? "deleted" : "updated");
    revalidatePath("/checklist/offboarding");
    revalidatePath("/checklist/todos");
    revalidatePath("/employees");

    return NextResponse.json({
      success: true,
      ...result,
      employeeId: id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Offboarding failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
