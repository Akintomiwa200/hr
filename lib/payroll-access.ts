import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export async function canViewPayrollRecord(
  session: SessionUser,
  record: { employeeId: string }
) {
  if (session.role === "ADMIN") return true;
  if (session.role === "EMPLOYEE" && session.employeeId === record.employeeId) {
    return true;
  }
  if (session.role === "MANAGER" && session.employeeId) {
    if (session.employeeId === record.employeeId) return true;
    const employee = await prisma.employee.findUnique({
      where: { id: record.employeeId },
      select: { managerId: true },
    });
    return employee?.managerId === session.employeeId;
  }
  return false;
}

export async function canManagePayrollRecord(
  session: SessionUser,
  record: { employeeId: string }
) {
  if (session.role === "ADMIN") return true;
  if (session.role === "MANAGER" && session.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: record.employeeId },
      select: { managerId: true },
    });
    return employee?.managerId === session.employeeId;
  }
  return false;
}

export function canManagePayrollSettings(session: SessionUser) {
  return session.role === "ADMIN" || session.role === "MANAGER";
}

export async function payrollListWhere(session: SessionUser) {
  if (session.role === "EMPLOYEE" && session.employeeId) {
    return { employeeId: session.employeeId };
  }
  if (session.role === "MANAGER" && session.employeeId) {
    return {
      OR: [
        { employeeId: session.employeeId },
        { employee: { managerId: session.employeeId } },
      ],
    };
  }
  return {};
}
