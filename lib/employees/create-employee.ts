import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EMPLOYEE_PASSWORD } from "@/lib/constants/auth";
import { sendWelcomeEmail, type SendEmailResult } from "@/lib/email";
import { nextEmployeeCode } from "@/lib/employees/next-employee-code";
import { pinFromEmployeeCode } from "@/lib/zkteco/pin";
import { parseLocalDate } from "@/lib/dates";

export type CreateEmployeeInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  jobTitle: string;
  departmentId: string;
  managerId?: string | null;
  employmentType?: string;
  role?: Role | string;
  roleId?: string | null;
  salary?: number | string;
  status?: string;
  companyId?: string | null;
  biometricPin?: string | null;
  branchId?: string | null;
  hireDate?: string | Date | null;
};

export type CreateEmployeeResult = {
  employee: NonNullable<
    Awaited<ReturnType<typeof createEmployeeAccount>>["employee"]
  >;
  email: SendEmailResult & { previewUrl?: string };
};

function normalizeRoleInput(role?: Role | string): Role {
  if (
    role === "COMPANY_ADMIN" ||
    role === "HR" ||
    role === "ACCOUNT_OFFICER" ||
    role === "MANAGER" ||
    role === "SUPERVISOR" ||
    role === "EMPLOYEE"
  ) {
    return role;
  }
  return Role.EMPLOYEE;
}

async function resolveManagerId(input: {
  managerId?: string | null;
  departmentId: string;
  companyId?: string | null;
  role: Role;
}): Promise<string | null> {
  const requested = input.managerId?.trim() || null;

  if (requested) {
    const manager = await prisma.employee.findFirst({
      where: {
        id: requested,
        status: "ACTIVE",
        ...(input.companyId
          ? { user: { companyId: input.companyId } }
          : {}),
      },
      select: { id: true },
    });
    return manager?.id ?? null;
  }

  // New managers/supervisors/admins don't need a line manager by default.
  if (
    input.role === "MANAGER" ||
    input.role === "SUPERVISOR" ||
    input.role === "COMPANY_ADMIN" ||
    input.role === "HR" ||
    input.role === "ACCOUNT_OFFICER"
  ) {
    return null;
  }

  // If exactly one active manager/supervisor exists in the department, assign them.
  const departmentLeads = await prisma.employee.findMany({
    where: {
      departmentId: input.departmentId,
      status: "ACTIVE",
      user: {
        role: { in: ["MANAGER", "SUPERVISOR"] },
        ...(input.companyId ? { companyId: input.companyId } : {}),
      },
    },
    select: { id: true },
    take: 2,
  });

  return departmentLeads.length === 1 ? departmentLeads[0].id : null;
}

/**
 * When someone is registered as a manager/supervisor, attach department employees
 * who don't already report to anyone — so the new manager isn't stuck at "0 team".
 */
async function adoptUnmanagedDepartmentEmployees(options: {
  managerEmployeeId: string;
  departmentId: string;
  companyId?: string | null;
}) {
  await prisma.employee.updateMany({
    where: {
      departmentId: options.departmentId,
      managerId: null,
      status: "ACTIVE",
      id: { not: options.managerEmployeeId },
      user: {
        role: "EMPLOYEE",
        ...(options.companyId ? { companyId: options.companyId } : {}),
      },
    },
    data: { managerId: options.managerEmployeeId },
  });
}

async function uniqueBiometricPin(companyId: string | null | undefined, employeeCode: string) {
  const preferred = pinFromEmployeeCode(employeeCode);
  if (!preferred) return null;
  let n = Number.parseInt(preferred, 10);
  if (!Number.isFinite(n)) return preferred;
  let candidate = preferred;
  for (let i = 0; i < 50; i++) {
    const taken = await prisma.employee.findFirst({
      where: {
        biometricPin: candidate,
        ...(companyId ? { user: { companyId } } : {}),
      },
      select: { id: true },
    });
    if (!taken) return candidate;
    n += 1;
    candidate = String(n);
  }
  return preferred;
}

export async function createEmployeeAccount(input: CreateEmployeeInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const employmentType =
    input.employmentType === "FREELANCE" ? "FREELANCE" : "FULL_TIME";
  let role = normalizeRoleInput(input.role);
  let roleDefinitionId: string | null = input.roleId?.trim() || null;
  if (roleDefinitionId) {
    const definition = await prisma.roleDefinition.findUnique({
      where: { id: roleDefinitionId },
    });
    if (!definition || !definition.isActive) {
      roleDefinitionId = null;
    } else {
      role = definition.baseRole;
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const managerId = await resolveManagerId({
    managerId: input.managerId,
    departmentId: input.departmentId,
    companyId: input.companyId,
    role,
  });

  const employeeCode = await nextEmployeeCode();
  const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);
  const biometricPin =
    (typeof input.biometricPin === "string" && input.biometricPin.trim()) ||
    (await uniqueBiometricPin(input.companyId, employeeCode));

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role,
      ...(input.companyId ? { companyId: input.companyId } : {}),
      employee: {
        create: {
          employeeCode,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: normalizedEmail,
          phone: input.phone || null,
          address: input.address || null,
          jobTitle: input.jobTitle.trim(),
          employmentType,
          departmentId: input.departmentId,
          branchId: input.branchId?.trim() || null,
          roleId: roleDefinitionId,
          biometricPin,
          managerId,
          hireDate: parseLocalDate(input.hireDate) ?? new Date(),
          salary: Number(input.salary) || 0,
          status: input.status || "ACTIVE",
        },
      },
    },
    include: {
      employee: {
        include: {
          department: true,
          user: { select: { role: true } },
        },
      },
    },
  });

  const employee = user.employee!;

  if (role === "MANAGER" || role === "SUPERVISOR") {
    await adoptUnmanagedDepartmentEmployees({
      managerEmployeeId: employee.id,
      departmentId: input.departmentId,
      companyId: input.companyId,
    });
  }

  const email = await sendWelcomeEmail({
    to: normalizedEmail,
    firstName: employee.firstName,
    lastName: employee.lastName,
    password: DEFAULT_EMPLOYEE_PASSWORD,
    jobTitle: employee.jobTitle,
    employeeCode: employee.employeeCode,
  });

  return { employee, email };
}
