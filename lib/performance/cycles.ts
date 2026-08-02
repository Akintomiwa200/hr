import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/performance/access";

export async function getEligibleEmployees(cycle: {
  includeAllEmployees: boolean;
  departmentIds: string | null;
  roleFilters: string | null;
}) {
  const departmentIds = parseJsonArray(cycle.departmentIds);
  const roleFilters = parseJsonArray(cycle.roleFilters);

  return prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      ...(cycle.includeAllEmployees
        ? {}
        : {
            OR: [
              ...(departmentIds.length > 0
                ? [{ departmentId: { in: departmentIds } }]
                : []),
              ...(roleFilters.length > 0
                ? [{ user: { role: { in: roleFilters as ("ADMIN" | "MANAGER" | "EMPLOYEE")[] } } }]
                : []),
            ],
          }),
    },
    include: {
      user: { select: { role: true } },
      manager: { select: { id: true } },
    },
    orderBy: { firstName: "asc" },
  });
}

export async function activateAppraisalCycle(cycleId: string) {
  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { kpis: true },
  });
  if (!cycle) throw new Error("CYCLE_NOT_FOUND");
  if (cycle.kpis.length === 0) throw new Error("CYCLE_NEEDS_KPIS");

  const employees = await getEligibleEmployees(cycle);

  await prisma.$transaction(async (tx) => {
    for (const employee of employees) {
      const managerId = employee.managerId ?? employee.id;
      const appraisal = await tx.performanceAppraisal.upsert({
        where: { cycleId_employeeId: { cycleId, employeeId: employee.id } },
        create: {
          cycleId,
          employeeId: employee.id,
          managerId,
          status: "SELF_REVIEW",
        },
        update: { status: "SELF_REVIEW" },
      });

      for (const link of cycle.kpis) {
        await tx.appraisalKpiScore.upsert({
          where: {
            appraisalId_kpiId: { appraisalId: appraisal.id, kpiId: link.kpiId },
          },
          create: { appraisalId: appraisal.id, kpiId: link.kpiId },
          update: {},
        });
      }
    }

    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: { status: "ACTIVE" },
    });
  });

  return prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      kpis: { include: { kpi: true } },
      appraisals: { include: { employee: true, manager: true } },
    },
  });
}
