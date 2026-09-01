import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseLocalDate } from "@/lib/dates";
import { roleLabel } from "@/lib/roles";
import {
  createEmployeeAccount,
  type CreateEmployeeInput,
} from "@/lib/employees/create-employee";

export const EMPLOYEE_IMPORT_COLUMNS = [
  { key: "employeeCode", header: "Employee code", width: 18 },
  { key: "firstName", header: "First name", width: 16 },
  { key: "lastName", header: "Last name", width: 16 },
  { key: "email", header: "Work email", width: 24 },
  { key: "jobTitle", header: "Job title", width: 20 },
  { key: "department", header: "Department", width: 20 },
  { key: "branch", header: "Branch", width: 20 },
  { key: "manager", header: "Manager", width: 20 },
  { key: "employment", header: "Employment", width: 14 },
  { key: "role", header: "Role", width: 18 },
  { key: "salary", header: "Salary", width: 14 },
  { key: "hireDate", header: "Start date", width: 16 },
] as const;

export type EmployeeImportRow = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  branch: string;
  manager: string;
  employment: string;
  role: string;
  salary: string;
  hireDate: string;
};

const EMPLOYMENT_OPTIONS = ["Full-time", "Freelance"];

const ROLE_OPTIONS: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "ACCOUNT_OFFICER",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export type TemplateContext = {
  companyId?: string | null;
  scopeAccess?: Array<Record<string, unknown>>;
};

const ROLE_BY_LABEL: Record<string, Role> = {};
for (const role of ROLE_OPTIONS) {
  ROLE_BY_LABEL[roleLabel(role).toLowerCase()] = role;
  ROLE_BY_LABEL[role.toLowerCase()] = role;
}

export async function buildEmployeeImportWorkbook(
  context: TemplateContext
): Promise<Buffer> {
  const [departments, managers, branches] = await Promise.all([
    prisma.department.findMany({
      where: context.companyId ? { companyId: context.companyId } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.employee.findMany({
      where: {
        ...(context.companyId
          ? { user: { companyId: context.companyId, role: { in: ["MANAGER", "SUPERVISOR", "HR", "COMPANY_ADMIN"] } } }
          : { user: { role: { in: ["MANAGER", "SUPERVISOR", "HR", "COMPANY_ADMIN"] } } }),
        status: "ACTIVE",
      },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.branch.findMany({
      where: context.companyId ? { companyId: context.companyId } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const roleOptions = ROLE_OPTIONS.map(roleLabel);
  const departmentNames = departments.map((d) => d.name).filter(Boolean);
  const branchNames = branches.map((b) => b.name).filter(Boolean);
  const managerNames = managers
    .map((m) => `${m.firstName} ${m.lastName}`.trim())
    .filter(Boolean);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Smart HR";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Employees", {
    properties: { defaultRowHeight: 20 },
  });

  sheet.columns = [...EMPLOYEE_IMPORT_COLUMNS];

  const headerRow = sheet.addRow(EMPLOYEE_IMPORT_COLUMNS.map((c) => c.header));
  headerRow.height = 22;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF7B61FF" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.eachCell((cell) => {
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
    };
  });

  // A single example row (blank except role/employment/manager dropdowns shown)
  const example = sheet.addRow([
    "",
    "Alex",
    "Johnson",
    "alex@company.com",
    "IT manager",
    departmentNames[0] ?? "",
    branchNames[0] ?? "",
    managerNames[0] ?? "",
    "Full-time",
    roleLabel("EMPLOYEE"),
    "85000",
    "08/30/2026",
  ]);
  example.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF7F5FF" },
    };
  });

  // Options sheet holding the dropdown lists
  const options = workbook.addWorksheet("Options", { state: "hidden" });

  const listStart = 2;
  let col = 1;

  const addList = (header: string, values: string[]) => {
    const cell = options.getCell(1, col);
    cell.value = header;
    cell.font = { bold: true };
    values.forEach((v, idx) => {
      options.getCell(listStart + idx, col).value = v;
    });
    col += 1;
    return `${header}`;
  };

  addList("Department", departmentNames);
  addList("Branch", branchNames);
  addList("Manager", managerNames);
  addList("Role", roleOptions);
  addList("Employment", EMPLOYMENT_OPTIONS);

  // Column letter -> options column
  const deptCol = 1;
  const branchCol = 2;
  const mgrCol = 3;
  const roleCol = 4;
  const empCol = 5;
  const letterFor = (list: number) =>
    XLSX.utils.encode_col(list - 1);

  const deptOptionRange = `=Options!$${letterFor(deptCol)}$${listStart}:$${letterFor(deptCol)}${
    departmentNames.length + listStart - 1
  }`;
  const branchOptionRange = `=Options!$${letterFor(branchCol)}$${listStart}:$${letterFor(branchCol)}${
    branchNames.length + listStart - 1
  }`;
  const mgrOptionRange = `=Options!$${letterFor(mgrCol)}$${listStart}:$${letterFor(mgrCol)}${
    managerNames.length + listStart - 1
  }`;
  const roleOptionRange = `=Options!$${letterFor(roleCol)}$${listStart}:$${letterFor(roleCol)}${
    roleOptions.length + listStart - 1
  }`;
  const empOptionRange = `=Options!$${letterFor(empCol)}$${listStart}:$${letterFor(empCol)}${
    EMPLOYMENT_OPTIONS.length + listStart - 1
  }`;

  // Header row is row 1, example is row 2; data starts at row 3
  const dataStart = 3;
  const dataEnd = 5003; // generous range for the user's rows

  const setList = (colLetter: string, range: string) => {
    const sheetWithValidations = sheet as typeof sheet & {
      dataValidations: {
        add: (ref: string, rule: {
          type: string;
          allowBlank?: boolean;
          formulae?: string[];
        }) => void;
      };
    };
    sheetWithValidations.dataValidations.add(`${colLetter}${dataStart}:${colLetter}${dataEnd}`, {
      type: "list",
      allowBlank: true,
      formulae: [range],
    });
  };

  setList("F", deptOptionRange);
  setList("G", branchOptionRange);
  setList("H", mgrOptionRange);
  setList("I", empOptionRange);
  setList("J", roleOptionRange);

  sheet.autoFilter = { from: "A1", to: "L1" };
  sheet.views = [{ state: "frozen", ySplit: 2 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function parseEmployeeImportWorkbook(buffer: Buffer): EmployeeImportRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetNames = workbook.SheetNames.filter((n) => n.toLowerCase() !== "options");
  if (sheetNames.length === 0) return [];

  const rows: EmployeeImportRow[] = [];
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    for (const row of raw) {
      const firstName = String(row["First name"] ?? "").trim();
      const lastName = String(row["Last name"] ?? "").trim();
      const email = String(row["Work email"] ?? "").trim();
      if (!firstName && !lastName && !email) continue;
      if (
        firstName.toLowerCase() === "first name" ||
        lastName.toLowerCase() === "last name" ||
        email.toLowerCase() === "work email"
      )
        continue;

      rows.push({
        employeeCode: String(row["Employee code"] ?? "").trim(),
        firstName,
        lastName,
        email,
        jobTitle: String(row["Job title"] ?? "").trim(),
        department: String(row["Department"] ?? "").trim(),
        branch: String(row["Branch"] ?? "").trim(),
        manager: String(row["Manager"] ?? "").trim(),
        employment: String(row["Employment"] ?? "").trim(),
        role: String(row["Role"] ?? "").trim(),
        salary: String(row["Salary"] ?? "").trim(),
        hireDate: String(row["Start date"] ?? "").trim(),
      });
    }
  }
  return rows;
}

export type TemplateImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  rows: Array<{
    name: string;
    employeeCode: string;
    role: string;
    manager: string;
  }>;
};

export async function importEmployeesFromTemplate(
  context: TemplateContext,
  rows: EmployeeImportRow[]
): Promise<TemplateImportResult> {
  const result: TemplateImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    rows: [],
  };
  const companyId = context.companyId ?? null;

  const [departments, managerPool, branches] = await Promise.all([
    prisma.department.findMany({
      where: companyId ? { companyId } : {},
      select: { id: true, name: true },
    }),
    prisma.employee.findMany({
      where: {
        ...(companyId
          ? { user: { companyId, role: { in: ["MANAGER", "SUPERVISOR", "HR", "COMPANY_ADMIN"] } } }
          : { user: { role: { in: ["MANAGER", "SUPERVISOR", "HR", "COMPANY_ADMIN"] } } }),
        status: "ACTIVE",
      },
      select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
    }),
    prisma.branch.findMany({
      where: companyId ? { companyId } : {},
      select: { id: true, name: true },
    }),
  ]);

  const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
  const branchByName = new Map(branches.map((b) => [b.name.toLowerCase(), b.id]));
  const managerByName = new Map<string, string>();
  const managerByEmail = new Map<string, string>();
  for (const m of managerPool) {
    const full = `${m.firstName} ${m.lastName}`.trim().toLowerCase();
    if (full && !managerByName.has(full)) managerByName.set(full, m.id);
    if (m.email?.trim()) managerByEmail.set(m.email.trim().toLowerCase(), m.id);
  }

  const existingCodes = await prisma.employee.findMany({
    where: companyId ? { user: { companyId } } : {},
    select: { id: true, employeeCode: true },
  });
  const codeToId = new Map(
    existingCodes.map((e) => [e.employeeCode.trim().toLowerCase(), e.id])
  );

  for (const row of rows) {
    const name = `${row.firstName} ${row.lastName}`.trim() || row.email;

    const departmentId = deptByName.get(row.department.toLowerCase());
    if (!departmentId) {
      result.errors.push(`${name}: unknown Department "${row.department || "(blank)"}"`);
      result.skipped += 1;
      continue;
    }

    const branchKey = row.branch.trim().toLowerCase();
    const branchId =
      branchKey === "none" || !branchKey
        ? null
        : branchByName.get(branchKey) || null;
    if (branchKey && branchKey !== "none" && !branchId) {
      result.errors.push(`${name}: unknown Branch "${row.branch.trim()}"`);
      result.skipped += 1;
      continue;
    }

    const mgrKey = row.manager.trim().toLowerCase();
    const managerId =
      managerByEmail.get(mgrKey) ||
      (mgrKey === "none" || !row.manager.trim()
        ? null
        : managerByName.get(mgrKey) || null);

    const role = ROLE_BY_LABEL[row.role.trim().toLowerCase()] ?? Role.EMPLOYEE;

    const employment = /freelance/i.test(row.employment) ? "FREELANCE" : "FULL_TIME";
    const salary = Number(String(row.salary).replace(/[^0-9.-]/g, "")) || 0;
    const hireDate = parseLocalDate(row.hireDate) ?? new Date();

    const requestedCode = row.employeeCode.trim();
    const existingId = requestedCode ? codeToId.get(requestedCode.toLowerCase()) : null;

    const input: CreateEmployeeInput = {
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      jobTitle: row.jobTitle || "Staff",
      departmentId,
      branchId,
      managerId: managerId ?? undefined,
      employmentType: employment,
      role,
      salary,
      status: "ACTIVE",
      companyId,
      hireDate,
      employeeCode: requestedCode || null,
    };

    try {
      if (existingId && requestedCode) {
        await updateImportedEmployee(existingId, input);
        result.updated += 1;
        result.rows.push({ name, employeeCode: requestedCode, role, manager: row.manager });
      } else {
        const { employee } = await createEmployeeAccount(input);
        result.created += 1;
        result.rows.push({
          name,
          employeeCode: employee.employeeCode,
          role,
          manager: row.manager,
        });
        codeToId.set(employee.employeeCode.trim().toLowerCase(), employee.id);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_EXISTS") {
        result.errors.push(`${name}: email ${row.email} already exists`);
      } else {
        result.errors.push(`${name}: ${err instanceof Error ? err.message : "import failed"}`);
      }
      result.skipped += 1;
    }
  }

  return result;
}

async function updateImportedEmployee(employeeId: string, input: CreateEmployeeInput) {
  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      jobTitle: input.jobTitle.trim(),
      departmentId: input.departmentId,
      branchId: input.branchId ?? null,
      managerId: input.managerId ?? null,
      salary: Number(input.salary) || 0,
      hireDate: parseLocalDate(input.hireDate) ?? undefined,
    },
  });
  if (!input.email || !input.email.includes("@")) return;
  await prisma.user.updateMany({
    where: { email: input.email.toLowerCase() },
    data: { role: input.role as Role },
  });
}
