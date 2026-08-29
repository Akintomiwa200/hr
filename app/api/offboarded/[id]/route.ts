import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageEmployees } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hardDeleteEmployee } from "@/lib/offboarding/cleanup";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageEmployees(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      endDate: true,
      user: { select: { companyId: true } },
    },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Company scope guard
  if (
    session.companyId &&
    employee.user?.companyId &&
    employee.user.companyId !== session.companyId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only allow permanent deletion of offboarded staff
  if (employee.status !== "INACTIVE") {
    return NextResponse.json(
      { error: "Only offboarded staff can be permanently deleted" },
      { status: 400 }
    );
  }

  const deleted = await hardDeleteEmployee(id);

  broadcastAppEvent("employee_updated", {
    id,
    action: "offboarded_deleted",
  });

  return NextResponse.json({ success: deleted });
}
