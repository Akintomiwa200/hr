/**
 * Import ZKTeco/BioTime employee export (.xlsx) into Smart HR with device PINs.
 *
 * Usage:
 *   npx tsx scripts/import-zkteco-employees.ts "C:\path\Employee_export.xlsx"
 *   npx tsx scripts/import-zkteco-employees.ts --dry-run "C:\path\file.xlsx"
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";
import { importDeviceEmployees } from "../lib/employees/import-from-device";
import {
  parseZktecoEmployeeSheet,
  summarizeImportRows,
} from "../lib/employees/parse-zkteco-export";

const DEFAULT_COMPANY_ID = "cmsok27i20000l604wcgf5nt3"; // Peter's Organization
const DEFAULT_BRANCH_ID = "cmtcq8c4k00017llcxay6c8so"; // Shop Perfect olutunda

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileArg = args.find((a) => !a.startsWith("--"));
  if (!fileArg) {
    console.error("Usage: npx tsx scripts/import-zkteco-employees.ts [--dry-run] <file.xlsx>");
    process.exit(1);
  }

  const filePath = resolve(fileArg);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const workbook = XLSX.read(readFileSync(filePath), { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = parseZktecoEmployeeSheet(sheet);

  console.log("Sheet:", workbook.SheetNames[0]);
  console.log("Parsed staff with PIN:", summarizeImportRows(rows));

  if (rows.length === 0) {
    console.error("No rows with a device PIN found. Check column names in the export.");
    process.exit(1);
  }

  if (dryRun) {
    console.log("Dry run — no database changes.");
    return;
  }

  const company = await prisma.company.findUnique({
    where: { id: DEFAULT_COMPANY_ID },
    select: { id: true, name: true },
  });
  if (!company) {
    console.error(`Company ${DEFAULT_COMPANY_ID} not found`);
    process.exit(1);
  }

  const department = await prisma.department.findFirst({
    where: { companyId: company.id },
    select: { id: true, name: true },
  });
  if (!department) {
    console.error("No department for company");
    process.exit(1);
  }

  const branch = await prisma.branch.findUnique({
    where: { id: DEFAULT_BRANCH_ID },
    select: { id: true, name: true },
  });

  console.log(`Importing into ${company.name} · ${department.name} · ${branch?.name ?? "no branch"}`);

  const result = await importDeviceEmployees({
    companyId: company.id,
    departmentId: department.id,
    branchId: branch?.id ?? null,
    rows,
    updateExistingPin: true,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
