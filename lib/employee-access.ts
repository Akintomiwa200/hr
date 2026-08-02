import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export async function canManageEmployee(
  session: SessionUser,
  employeeId?: string
): Promise<boolean> {
  if (session.role === "ADMIN" || session.role === "MANAGER") return true;
  return false;
}

export async function canViewEmployee(
  session: SessionUser,
  employeeId: string
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (session.employeeId === employeeId) return true;

  if (session.role === "MANAGER" && session.employeeId) {
    const report = await prisma.employee.findFirst({
      where: { id: employeeId, managerId: session.employeeId },
      select: { id: true },
    });
    return !!report;
  }

  return false;
}

export async function getEmployeeOrNull(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: { department: true },
  });
}
