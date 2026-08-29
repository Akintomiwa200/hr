import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canManageEmployee,
  employeeIdsInCompanyScope,
} from "@/lib/employee-access";
import { notifyEmployeeChange } from "@/lib/employees/mutations";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !(await canManageEmployee(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids, action, departmentId } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No employees selected" }, { status: 400 });
  }

  const scopedIds = await employeeIdsInCompanyScope(session, ids);
  if (scopedIds.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "deactivate") {
    await prisma.employee.updateMany({
      where: { id: { in: scopedIds } },
      data: { status: "INACTIVE" },
    });
    await prisma.employee.updateMany({
      where: { id: { in: scopedIds }, endDate: null },
      data: { endDate: new Date() },
    });
  } else if (action === "activate") {
    await prisma.employee.updateMany({
      where: { id: { in: scopedIds } },
      data: { status: "ACTIVE" },
    });
  } else if (action === "set_department" && departmentId) {
    await prisma.employee.updateMany({
      where: { id: { in: scopedIds } },
      data: { departmentId },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  notifyEmployeeChange(scopedIds[0], "bulk_updated");

  return NextResponse.json({ success: true, count: scopedIds.length });
}
