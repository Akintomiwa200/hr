import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EMPLOYEE_PASSWORD } from "@/lib/constants/auth";
import { sendWelcomeEmail, type SendEmailResult } from "@/lib/email";

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

export async function createEmployeeAccount(input: CreateEmployeeInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const employmentType = input.employmentType ?? "FULL_TIME";
  const resolvedJobTitle =
    employmentType === "FREELANCE" &&
    !input.jobTitle.toLowerCase().includes("freelance")
      ? `${input.jobTitle} (Freelance)`
      : input.jobTitle;

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const count = await prisma.employee.count();
  const employeeCode = `EMP${String(count + 1).padStart(3, "0")}`;
  const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: (input.role as Role) || Role.EMPLOYEE,
      ...(input.companyId ? { companyId: input.companyId } : {}),
      employee: {
        create: {
          employeeCode,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: normalizedEmail,
          phone: input.phone || null,
          address: input.address || null,
          jobTitle: resolvedJobTitle,
          departmentId: input.departmentId,
          managerId: input.managerId || null,
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
