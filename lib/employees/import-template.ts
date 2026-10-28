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
  { key: "middleName", header: "Middle name", width: 16 },
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
  { key: "dateOfBirth", header: "Date of birth", width: 16 },
  { key: "address", header: "Address", width: 30 },
] as const;

export type EmployeeImportRow = {
  employeeCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  branch: string;
  manager: string;
  employment: string;
  role: string;
  salary: string;
  hireDate: string;
  dateOfBirth: string;
  address: string;
  status: string;
};

/** Compare header labels without worrying about case, spaces, or punctuation. */
function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
}

/**
 * Build a header-insensitive accessor so sheets using "Name", "Email", or
 * "Employee ID" (instead of the template's exact labels) still import.
 */
function rowReader(row: Record<string, unknown>) {
  const values = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    const text = cellText(value);
    if (text) values.set(normalizeHeader(key), text);
  }
  return (...aliases: string[]) => {
    for (const alias of aliases) {
      const text = values.get(normalizeHeader(alias));
      if (text) return text;
    }
    return "";
  };
}

/**
 * Split a single "Name" cell into first / middle / last name.
 * Supports "John Doe", "Mary Jane Okoro", and "Okoro, Mary Jane".
 */
export function splitFullName(fullName: string): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  const value = fullName.trim();
  if (!value) return { firstName: "", middleName: "", lastName: "" };

  // "Last, First Middle" (common in exported/legacy spreadsheets)
  const commaIndex = value.indexOf(",");
  if (commaIndex > 0) {
    const last = value.slice(0, commaIndex).trim();
    const rest = value
      .slice(commaIndex + 1)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (rest.length === 0) {
      return { firstName: last, middleName: "", lastName: "" };
    }
    return {
      firstName: rest[0],
      middleName: rest.slice(1).join(" "),
      lastName: last,
    };
  }

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: "" };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: "", lastName: parts[1] };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

const HEADER_WORDS = new Set([
  "name",
  "fullname",
  "firstname",
  "middlename",
  "lastname",
  "email",
  "workemail",
  "employeeid",
  "employeecode",
]);

function looksLikeHeaderRow(
  firstName: string,
  middleName: string,
  lastName: string,
  email: string
) {
  return [firstName, middleName, lastName, email].some((value) =>
    HEADER_WORDS.has(normalizeHeader(value))
  );
}

export function parseStatus(value: string): "ACTIVE" | "INACTIVE" {
  return /inactive|terminated|resigned|suspended|offboard|left/i.test(value)
    ? "INACTIVE"
    : "ACTIVE";
}

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

  // Keep the column definitions for widths/keys but write the header row
  // explicitly below so it is not duplicated by ExcelJS.
  sheet.columns = EMPLOYEE_IMPORT_COLUMNS.map((c) => ({
    key: c.key,
    width: c.width,
  }));

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
    "",
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
    "",
    "",
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

  setList("G", deptOptionRange);
  setList("H", branchOptionRange);
  setList("I", mgrOptionRange);
  setList("J", empOptionRange);
  setList("K", roleOptionRange);

  sheet.autoFilter = { from: "A1", to: "O1" };
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
      const get = rowReader(row);

      const email = get("Work email", "Email", "Email address", "E-mail");
      const fullName = get("Name", "Full name", "Employee name", "Staff name");
      let firstName = get("First name", "Firstname", "Given name");
      let middleName = get("Middle name", "Middlename", "Middle names", "Other name");
      let lastName = get("Last name", "Lastname", "Surname", "Family name");

      // A single "Name" column is accepted — split it into first/middle/last.
      if (!firstName && !lastName && fullName) {
        const split = splitFullName(fullName);
        firstName = split.firstName;
        middleName = middleName || split.middleName;
        lastName = split.lastName;
      }

      if (!firstName && !lastName && !email) continue;
      if (looksLikeHeaderRow(firstName, middleName, lastName, email)) continue;

      rows.push({
        employeeCode: get("Employee code", "Employee ID", "Staff ID", "Employee No"),
        firstName,
        middleName,
        lastName,
        email,
        phone: get("Phone", "Phone number", "Mobile", "Mobile number"),
        jobTitle: get(
          "Job title",
          "Job Title",
          "Position",
          "Designation",
          "Job role"
        ),
        department: get("Department", "Dept", "Unit"),
        branch: get("Branch", "Location", "Office"),
        manager: get("Manager", "Line manager", "Reports to"),
        employment: get("Employment", "Employment type", "Type"),
        role: get("Role", "System role", "Access level"),
        salary: get("Salary", "Gross salary", "Annual salary", "Monthly salary"),
        hireDate: get(
          "Start date",
          "Hire date",
          "Date joined",
          "Joining date",
          "Employment date"
        ),
        dateOfBirth: get("Date of birth", "Date of Birth", "DOB", "Birth date"),
        address: get("Address", "Residential address", "Home address"),
        status: get("Status", "Employment status"),
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
    const name =
      `${row.firstName} ${row.middleName} ${row.lastName}`.replace(/\s+/g, " ").trim() ||
      row.email;

    // Resolve or auto-create the department so rows aren't dropped for a missing match.
    const deptName = row.department.trim();
    let departmentId = deptName
      ? deptByName.get(deptName.toLowerCase())
      : undefined;
    if (deptName && !departmentId) {
      const created = await prisma.department.create({
        data: {
          name: deptName,
          ...(companyId ? { companyId } : {}),
        },
      });
      departmentId = created.id;
      deptByName.set(deptName.toLowerCase(), created.id);
    }
    if (!departmentId) {
      result.errors.push(`${name}: Department is required`);
      result.skipped += 1;
      continue;
    }

    // Resolve or auto-create the branch. Blank or "none" leaves it unset.
    const branchKey = row.branch.trim().toLowerCase();
    let branchId =
      branchKey === "none" || !branchKey
        ? null
        : branchByName.get(branchKey) || null;
    if (branchKey && branchKey !== "none" && !branchId) {
      const created = await prisma.branch.create({
        data: {
          name: row.branch.trim(),
          location: row.branch.trim(),
          ...(companyId ? { companyId } : {}),
        },
      });
      branchId = created.id;
      branchByName.set(branchKey, created.id);
    }

    const mgrKey = row.manager.trim().toLowerCase();
    const managerId =
      managerByEmail.get(mgrKey) ||
      (mgrKey === "none" || !row.manager.trim()
        ? null
        : managerByName.get(mgrKey) || null);

    const role = row.role.trim()
      ? ROLE_BY_LABEL[row.role.trim().toLowerCase()] ?? Role.EMPLOYEE
      : undefined;

    const employment = /freelance/i.test(row.employment)
      ? "FREELANCE"
      : row.employment.trim()
        ? "FULL_TIME"
        : undefined;
    const status = row.status.trim() ? parseStatus(row.status) : undefined;
    const salary = Number(String(row.salary).replace(/[^0-9.-]/g, "")) || 0;
    const hireDate = parseLocalDate(row.hireDate) ?? new Date();
    const dateOfBirth = row.dateOfBirth ? parseLocalDate(row.dateOfBirth) : null;

    const requestedCode = row.employeeCode.trim();
    const existingId = requestedCode ? codeToId.get(requestedCode.toLowerCase()) : null;

    const input: CreateEmployeeInput = {
      firstName: row.firstName,
      middleName: row.middleName || null,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone || null,
      jobTitle: row.jobTitle || "Staff",
      departmentId,
      branchId,
      managerId: managerId ?? undefined,
      employmentType: employment,
      role,
      salary,
      status,
      companyId,
      hireDate,
      dateOfBirth,
      employeeCode: requestedCode || null,
      address: row.address || null,
    };

    try {
      if (existingId && requestedCode) {
        await updateImportedEmployee(existingId, input);
        result.updated += 1;
        result.rows.push({
          name,
          employeeCode: requestedCode,
          role: role ?? "EMPLOYEE",
          manager: row.manager,
        });
      } else {
        const { employee } = await createEmployeeAccount(input);
        result.created += 1;
        result.rows.push({
          name,
          employeeCode: employee.employeeCode,
          role: employee.user?.role ?? role ?? "EMPLOYEE",
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
      ...(input.middleName?.trim() ? { middleName: input.middleName.trim() } : {}),
      lastName: input.lastName.trim(),
      ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
      jobTitle: input.jobTitle.trim(),
      departmentId: input.departmentId,
      branchId: input.branchId ?? null,
      managerId: input.managerId ?? null,
      ...(input.employmentType
        ? {
            employmentType:
              input.employmentType === "FREELANCE" ? "FREELANCE" : "FULL_TIME",
          }
        : {}),
      salary: Number(input.salary) || 0,
      ...(input.status ? { status: input.status } : {}),
      hireDate: parseLocalDate(input.hireDate) ?? undefined,
      dateOfBirth: parseLocalDate(input.dateOfBirth) ?? null,
      address: input.address?.trim() || null,
    },
  });
  if (!input.role) return;
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true },
  });
  if (!employee) return;
  await prisma.user.update({
    where: { id: employee.userId },
    data: { role: input.role as Role },
  });
}
