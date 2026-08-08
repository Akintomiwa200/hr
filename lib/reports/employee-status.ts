import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PROBATION_DAYS = 90;

export async function resolveHrStatuses(
  employees: Array<{ id: string; hireDate: Date; status: string }>
): Promise<Map<string, string>> {
  const ids = employees.map((e) => e.id);
  const today = new Date();

  const [onLeave, onboarding] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: ids },
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: { employeeId: true },
    }),
    prisma.checklistInstance.findMany({
      where: {
        employeeId: { in: ids },
        type: "ONBOARDING",
        status: { not: "COMPLETED" },
      },
      select: { employeeId: true },
    }),
  ]);

  const onLeaveIds = new Set(onLeave.map((l) => l.employeeId));
  const onboardingIds = new Set(onboarding.map((i) => i.employeeId));
  const result = new Map<string, string>();

  for (const emp of employees) {
    if (emp.status === "INACTIVE") {
      result.set(emp.id, "RESIGNED");
      continue;
    }
    if (onLeaveIds.has(emp.id)) {
      result.set(emp.id, "ON LEAVE");
      continue;
    }
    if (onboardingIds.has(emp.id)) {
      result.set(emp.id, "ON BOARDING");
      continue;
    }
    const daysSinceHire = (Date.now() - emp.hireDate.getTime()) / 86_400_000;
    if (daysSinceHire <= PROBATION_DAYS) {
      result.set(emp.id, "PROBATION");
      continue;
    }
    result.set(emp.id, "ACTIVE");
  }

  return result;
}

export function defaultOfficeName(session: SessionUser): string {
  return session.companyId ? "Main Office" : "Head Office";
}
