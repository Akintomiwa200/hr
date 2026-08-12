import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EMPLOYEE_PASSWORD } from "@/lib/constants/auth";
import { sendWelcomeEmail, type SendEmailResult } from "@/lib/email";
import { nextEmployeeCode } from "@/lib/employees/next-employee-code";

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
  salary?: number | string;
  status?: string;
  companyId?: string | null;
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
    input.role === "HR"
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

export async function createEmployeeAccount(input: CreateEmployeeInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const employmentType =
    input.employmentType === "FREELANCE" ? "FREELANCE" : "FULL_TIME";
  const role = normalizeRoleInput(input.role);

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
          managerId,
          hireDate: new Date(),
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
