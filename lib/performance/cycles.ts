import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { parseJsonArray } from "@/lib/performance/access";
import { getPerformanceSettings } from "@/lib/performance/settings";
import { createNotification, notifyCompanyUsers } from "@/lib/notifications";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

function kpiAppliesToEmployee(
  kpi: { departmentId: string | null; roleFilter: string | null },
  employee: { departmentId: string; user: { role: Role } }
) {
  if (kpi.departmentId && kpi.departmentId !== employee.departmentId) return false;
  if (kpi.roleFilter && kpi.roleFilter !== employee.user.role) return false;
  return true;
}

export async function getEligibleEmployees(cycle: {
  companyId?: string | null;
  includeAllEmployees: boolean;
  departmentIds: string | null;
  roleFilters: string | null;
}) {
  const departmentIds = parseJsonArray(cycle.departmentIds);
  const roleFilters = parseJsonArray(cycle.roleFilters);

  return prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      ...(cycle.companyId
        ? { user: { companyId: cycle.companyId } }
        : {}),
      ...(cycle.includeAllEmployees
        ? {}
        : {
            OR: [
              ...(departmentIds.length > 0
                ? [{ departmentId: { in: departmentIds } }]
                : []),
              ...(roleFilters.length > 0
                ? [{ user: { role: { in: roleFilters as Role[] } } }]
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
    include: { kpis: { include: { kpi: true } } },
  });
  if (!cycle) throw new Error("CYCLE_NOT_FOUND");
  if (cycle.kpis.length === 0) throw new Error("CYCLE_NEEDS_KPIS");

  const settings = await getPerformanceSettings(cycle.companyId);
  const employees = await getEligibleEmployees(cycle);
  if (employees.length === 0) throw new Error("CYCLE_NO_ELIGIBLE_EMPLOYEES");

  await prisma.$transaction(async (tx) => {
    for (const employee of employees) {
      const applicableLinks = cycle.kpis.filter((link) =>
        kpiAppliesToEmployee(link.kpi, employee)
      );
      if (applicableLinks.length === 0) continue;

      const managerId = employee.managerId ?? employee.id;
      const appraisal = await tx.performanceAppraisal.upsert({
        where: { cycleId_employeeId: { cycleId, employeeId: employee.id } },
        create: {
          cycleId,
          employeeId: employee.id,
          managerId,
          status: "SELF_REVIEW",
        },
        update: { status: "SELF_REVIEW", managerId },
      });

      for (const link of applicableLinks) {
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

  if (settings.notifyOnActivate) {
    for (const employee of employees) {
      await createNotification({
        userId: employee.userId,
        type: "performance",
        title: "Performance review started",
        message: `${cycle.name} (${cycle.period}) is open — complete your self-appraisal.`,
        href: "/performance",
      });
    }
  }

  if (settings.announceOnActivate && cycle.companyId) {
    const announcement = await prisma.announcement.create({
      data: {
        companyId: cycle.companyId,
        title: `Performance cycle: ${cycle.name}`,
        content: `The ${cycle.period} performance review (${cycle.name}) is now active. Please complete your self-appraisal before the deadline${
          cycle.selfReviewDeadline
            ? ` (${cycle.selfReviewDeadline.toLocaleDateString()})`
            : ""
        }. Managers will review after self-submissions.`,
        author: "Performance",
        priority: "HIGH",
      },
    });
    await notifyCompanyUsers(cycle.companyId, {
      type: "announcement",
      title: "New announcement",
      message: announcement.title,
      href: "/announcements",
    });
    broadcastAppEvent("announcement_created", { id: announcement.id });
  }

  broadcastAppEvent("performance_updated", { id: cycleId, action: "activated" });
  broadcastAppEvent("appraisal_updated", { id: cycleId, action: "activated" });

  return prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      kpis: { include: { kpi: true } },
      appraisals: { include: { employee: true, manager: true } },
    },
  });
}
