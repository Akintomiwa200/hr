/**
 * Purge seeded "Smart HR Demo" company and @smarthr.com demo accounts.
 * Preserves real tenant companies and their users.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(fileName) {
  const p = resolve(root, fileName);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const { PrismaClient } = createRequire(resolve(root, "package.json"))("@prisma/client");
const prisma = new PrismaClient();

const KEEP_SUPERADMIN = "superadmin@smarthr.com";

async function deleteEmployees(employeeIds) {
  if (employeeIds.length === 0) return;

  await prisma.employee.updateMany({
    where: { managerId: { in: employeeIds } },
    data: { managerId: null },
  });

  await prisma.interviewReview.deleteMany({
    where: { interview: { interviewerId: { in: employeeIds } } },
  });
  await prisma.interview.deleteMany({ where: { interviewerId: { in: employeeIds } } });
  await prisma.jobApplication.updateMany({
    where: { reviewerId: { in: employeeIds } },
    data: { reviewerId: null },
  });

  await prisma.appraisalKpiScore.deleteMany({
    where: { appraisal: { OR: [{ employeeId: { in: employeeIds } }, { managerId: { in: employeeIds } }] } },
  });
  await prisma.performanceAppraisal.deleteMany({
    where: { OR: [{ employeeId: { in: employeeIds } }, { managerId: { in: employeeIds } }] },
  });
  await prisma.performanceReview.deleteMany({
    where: { OR: [{ employeeId: { in: employeeIds } }, { managerId: { in: employeeIds } }] },
  });

  await prisma.checklistTaskComment.deleteMany({
    where: { task: { instance: { employeeId: { in: employeeIds } } } },
  });
  await prisma.checklistTask.deleteMany({
    where: { instance: { employeeId: { in: employeeIds } } },
  });
  await prisma.checklistInstance.deleteMany({ where: { employeeId: { in: employeeIds } } });

  await prisma.checklistTask.updateMany({
    where: { assigneeId: { in: employeeIds } },
    data: { assigneeId: null },
  });
  await prisma.checklistTask.updateMany({
    where: { completedById: { in: employeeIds } },
    data: { completedById: null },
  });

  await prisma.document.updateMany({
    where: { employeeId: { in: employeeIds } },
    data: { employeeId: null },
  });
  await prisma.leaveRequest.deleteMany({
    where: { OR: [{ employeeId: { in: employeeIds } }, { approverId: { in: employeeIds } }] },
  });
  await prisma.attendance.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.payrollRecord.deleteMany({ where: { employeeId: { in: employeeIds } } });

  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
}

async function purgeCompany(companyId, label) {
  console.log(`\nPurging company: ${label}`);

  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true, email: true, employee: { select: { id: true } } },
  });
  const userIds = users.map((u) => u.id);

  // All employees in this company's departments (covers orphans)
  const deptEmployees = await prisma.employee.findMany({
    where: { department: { companyId } },
    select: { id: true },
  });
  const employeeIds = Array.from(
    new Set([
      ...users.map((u) => u.employee?.id).filter(Boolean),
      ...deptEmployees.map((e) => e.id),
    ])
  );

  console.log(`  users=${userIds.length} employees=${employeeIds.length}`);

  const jobs = await prisma.job.findMany({
    where: { OR: [{ companyId }, { department: { companyId } }] },
    select: { id: true },
  });
  const jobIds = jobs.map((j) => j.id);

  if (jobIds.length) {
    const apps = await prisma.jobApplication.findMany({
      where: { jobId: { in: jobIds } },
      select: { id: true },
    });
    const appIds = apps.map((a) => a.id);
    if (appIds.length) {
      await prisma.interviewReview.deleteMany({
        where: { interview: { applicationId: { in: appIds } } },
      });
      await prisma.interview.deleteMany({ where: { applicationId: { in: appIds } } });
      await prisma.applicationEvaluation.deleteMany({ where: { applicationId: { in: appIds } } });
      await prisma.applicationActivity.deleteMany({ where: { applicationId: { in: appIds } } });
      await prisma.jobApplication.deleteMany({ where: { id: { in: appIds } } });
    }
    await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
  }

  await deleteEmployees(employeeIds);

  if (userIds.length) {
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await prisma.document.deleteMany({ where: { companyId } });
  await prisma.documentFolder.deleteMany({ where: { companyId } });
  await prisma.checklistTaskComment.deleteMany({
    where: { task: { instance: { companyId } } },
  });
  await prisma.checklistTask.deleteMany({ where: { instance: { companyId } } });
  await prisma.checklistInstance.deleteMany({ where: { companyId } });
  await prisma.checklistTemplateTask.deleteMany({
    where: { template: { companyId } },
  });
  await prisma.checklistTemplate.deleteMany({ where: { companyId } });

  await prisma.appraisalKpiScore.deleteMany({
    where: { appraisal: { cycle: { companyId } } },
  });
  await prisma.performanceAppraisal.deleteMany({
    where: { cycle: { companyId } },
  });
  await prisma.appraisalCycleKpi.deleteMany({
    where: { cycle: { companyId } },
  });
  await prisma.appraisalCycle.deleteMany({ where: { companyId } });
  await prisma.kpiDefinition.deleteMany({ where: { companyId } });
  await prisma.performanceSettings.deleteMany({ where: { companyId } });

  await prisma.recruitmentEmailTemplate.deleteMany({ where: { companyId } });
  await prisma.recruitmentSource.deleteMany({ where: { companyId } });
  await prisma.recruitmentTag.deleteMany({ where: { companyId } });
  await prisma.recruitmentStage.deleteMany({ where: { companyId } });

  await prisma.payrollSettings.deleteMany({ where: { companyId } });
  await prisma.attendanceDevice.deleteMany({ where: { companyId } });
  await prisma.announcement.deleteMany({ where: { companyId } });
  await prisma.holiday.deleteMany({ where: { companyId } });
  await prisma.integration.deleteMany({ where: { companyId } });
  await prisma.department.deleteMany({ where: { companyId } });
  await prisma.company.delete({ where: { id: companyId } });

  console.log("  deleted.");
}

async function main() {
  const demoCompanies = await prisma.company.findMany({
    where: {
      OR: [
        { slug: "smarthr-demo" },
        { name: "Smart HR Demo" },
        { slug: { contains: "demo" } },
      ],
    },
  });

  for (const c of demoCompanies) {
    await purgeCompany(c.id, `${c.name} (${c.slug})`);
  }

  // Any leftover @smarthr.com users except platform superadmin
  const leftover = await prisma.user.findMany({
    where: {
      email: { endsWith: "@smarthr.com" },
      NOT: { email: KEEP_SUPERADMIN },
    },
    include: { employee: { select: { id: true } } },
  });

  if (leftover.length) {
    console.log(`\nRemoving ${leftover.length} leftover @smarthr.com demo user(s)…`);
    const empIds = leftover.map((u) => u.employee?.id).filter(Boolean);
    await deleteEmployees(empIds);
    await prisma.notification.deleteMany({
      where: { userId: { in: leftover.map((u) => u.id) } },
    });
    await prisma.user.deleteMany({ where: { id: { in: leftover.map((u) => u.id) } } });
  }

  // Fake careers applications (@email.com) not tied to real companies
  const fakeApps = await prisma.jobApplication.findMany({
    where: { email: { endsWith: "@email.com" } },
    select: { id: true },
  });
  if (fakeApps.length) {
    const ids = fakeApps.map((a) => a.id);
    await prisma.interviewReview.deleteMany({
      where: { interview: { applicationId: { in: ids } } },
    });
    await prisma.interview.deleteMany({ where: { applicationId: { in: ids } } });
    await prisma.applicationEvaluation.deleteMany({ where: { applicationId: { in: ids } } });
    await prisma.applicationActivity.deleteMany({ where: { applicationId: { in: ids } } });
    await prisma.jobApplication.deleteMany({ where: { id: { in: ids } } });
    console.log(`Removed ${ids.length} fake @email.com application(s).`);
  }

  // Dev kiosk device keys
  const deletedDevices = await prisma.attendanceDevice.deleteMany({
    where: { apiKey: { startsWith: "dev-device-key-" } },
  });
  if (deletedDevices.count) {
    console.log(`Removed ${deletedDevices.count} demo attendance device(s).`);
  }

  const summary = {
    companies: await prisma.company.findMany({ select: { name: true, slug: true } }),
    users: await prisma.user.findMany({ select: { email: true, role: true } }),
    employees: await prisma.employee.count(),
    jobs: await prisma.job.count(),
    applications: await prisma.jobApplication.count(),
  };
  console.log("\nRemaining:");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
