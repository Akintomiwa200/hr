/**
 * Remove seeded/dummy MANAGER accounts from the database.
 * Keeps real managers that HR creates in-app (non-seed emails).
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(fileName) {
  const filePath = resolve(root, fileName);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const require = createRequire(resolve(root, "package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DUMMY_MANAGER_EMAILS = ["manager@smarthr.com", "lisa.w@smarthr.com"];

async function removeManagerEmployee(employeeId, fallbackId) {
  await prisma.employee.updateMany({
    where: { managerId: employeeId },
    data: { managerId: null },
  });

  if (fallbackId) {
    await prisma.interview.updateMany({
      where: { interviewerId: employeeId },
      data: { interviewerId: fallbackId },
    });
    await prisma.performanceReview.updateMany({
      where: { managerId: employeeId },
      data: { managerId: fallbackId },
    });
    await prisma.performanceAppraisal.updateMany({
      where: { managerId: employeeId },
      data: { managerId: fallbackId },
    });
  } else {
    await prisma.interview.deleteMany({ where: { interviewerId: employeeId } });
    await prisma.performanceReview.deleteMany({
      where: { OR: [{ employeeId }, { managerId: employeeId }] },
    });
    await prisma.performanceAppraisal.deleteMany({
      where: { OR: [{ employeeId }, { managerId: employeeId }] },
    });
  }

  await prisma.jobApplication.updateMany({
    where: { reviewerId: employeeId },
    data: { reviewerId: null },
  });

  await prisma.checklistTask.updateMany({
    where: { assigneeId: employeeId },
    data: { assigneeId: null },
  });
  await prisma.checklistTask.updateMany({
    where: { completedById: employeeId },
    data: { completedById: null },
  });

  await prisma.leaveRequest.deleteMany({ where: { employeeId } });
  await prisma.attendance.deleteMany({ where: { employeeId } });
  await prisma.payrollRecord.deleteMany({ where: { employeeId } });
  await prisma.document.updateMany({
    where: { employeeId },
    data: { employeeId: null },
  });
  await prisma.checklistInstance.deleteMany({ where: { employeeId } });
  await prisma.performanceReview.deleteMany({ where: { employeeId } });
  await prisma.performanceAppraisal.deleteMany({ where: { employeeId } });

  await prisma.employee.delete({ where: { id: employeeId } });
}

async function main() {
  const dummyUsers = await prisma.user.findMany({
    where: {
      role: "MANAGER",
      OR: [
        { email: { in: DUMMY_MANAGER_EMAILS } },
        { email: { endsWith: "@smarthr.com" } },
      ],
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (dummyUsers.length === 0) {
    console.log("No dummy manager accounts found.");
    return;
  }

  const fallback =
    (await prisma.employee.findFirst({
      where: { user: { role: { in: ["HR", "COMPANY_ADMIN"] } } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    })) ?? null;

  console.log(`Removing ${dummyUsers.length} dummy manager account(s)…`);

  for (const user of dummyUsers) {
    const label = user.employee
      ? `${user.employee.firstName} ${user.employee.lastName} <${user.email}>`
      : user.email;
    console.log(`  - ${label}`);

    if (user.employee) {
      await removeManagerEmployee(user.employee.id, fallback?.id ?? null);
    }

    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  // Lisa was seeded as MANAGER then may still be EMPLOYEE with manager title — demote title only if still present as employee role.
  await prisma.employee.updateMany({
    where: { email: "lisa.w@smarthr.com", jobTitle: "Operations Manager" },
    data: { jobTitle: "Operations Coordinator" },
  });

  console.log("Done. Create managers from People / Onboarding in the app.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
