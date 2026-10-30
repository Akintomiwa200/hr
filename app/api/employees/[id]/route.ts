import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assertEmployeeInCompany,
  canManageEmployee,
  canViewEmployee,
} from "@/lib/employee-access";
import { notifyEmployeeChange } from "@/lib/employees/mutations";
import { canAssignRole, normalizeRole } from "@/lib/roles";
import { parseLocalDate } from "@/lib/dates";
import { parseEmployeeShiftFields } from "@/lib/employee-shift";
import { replayUnprocessedPunchesForEmployee } from "@/lib/zkteco/service";
import { audit } from "@/lib/audit";
import { notifyCompanyAdminsOfStaffChange } from "@/lib/employees/admin-alerts";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await canViewEmployee(session, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
      managers: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { role: true, suspendedAt: true, suspendedUntil: true, suspensionReason: true, archivedAt: true, isActive: true } },
      branch: { select: { id: true, name: true, location: true } },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(employee);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await canManageEmployee(session, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!(await assertEmployeeInCompany(session, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    employeeCode,
    firstName,
    middleName,
    lastName,
    email,
    phone,
    address,
    jobTitle,
    departmentId,
    branchId,
    biometricPin,
    isShiftWorker,
    shiftStartTime,
    managerId,
    managerIds,
    employmentType,
    role,
    salary,
    bankName,
    accountNumber,
    nin,
    status,
    hireDate,
    endDate,
    dateOfBirth,
    cameThroughAgent,
    agentName,
  } = body;
  if (cameThroughAgent && !String(agentName ?? "").trim()) {
    return NextResponse.json({ error: "Enter the agent name." }, { status: 400 });
  }

  if (role && existing.user) {
    const nextRole = normalizeRole(String(role));
    if (!canAssignRole(session.role, nextRole)) {
      return NextResponse.json(
        { error: "You cannot assign that system role" },
        { status: 403 }
      );
    }
  }

  if (email && email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
  }

  const resolvedEmploymentType =
    employmentType === "FREELANCE" || employmentType === "FULL_TIME"
      ? employmentType
      : undefined;

  const normalizedEmployeeCode =
    employeeCode === undefined ? undefined : String(employeeCode ?? "").trim();

  if (normalizedEmployeeCode !== undefined) {
    if (!normalizedEmployeeCode) {
      return NextResponse.json(
        { error: "Employee code is required" },
        { status: 400 }
      );
    }
    if (normalizedEmployeeCode.length > 50) {
      return NextResponse.json(
        { error: "Employee code must be 50 characters or fewer" },
        { status: 400 }
      );
    }
    if (normalizedEmployeeCode !== existing.employeeCode) {
      const codeTaken = await prisma.employee.findFirst({
        where: {
          employeeCode: normalizedEmployeeCode,
          id: { not: id },
        },
        select: { id: true },
      });
      if (codeTaken) {
        return NextResponse.json(
          { error: "Employee code already exists" },
          { status: 409 }
        );
      }
    }
  }

  const shiftFields =
    isShiftWorker !== undefined || shiftStartTime !== undefined
      ? parseEmployeeShiftFields({ isShiftWorker, shiftStartTime })
      : undefined;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(normalizedEmployeeCode !== undefined && {
        employeeCode: normalizedEmployeeCode,
      }),
      ...(firstName !== undefined && { firstName }),
      ...(middleName !== undefined && {
        middleName: middleName ? String(middleName).trim() || null : null,
      }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(address !== undefined && { address: address || null }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(resolvedEmploymentType !== undefined && {
        employmentType: resolvedEmploymentType,
      }),
      ...(departmentId !== undefined && { departmentId }),
      ...(branchId !== undefined && { branchId: branchId || null }),
      ...(biometricPin !== undefined && {
        biometricPin: biometricPin ? String(biometricPin).trim() : null,
      }),
      ...(shiftFields && shiftFields),
      ...(managerId !== undefined && { managerId: managerId || null }),
      ...(managerIds !== undefined && Array.isArray(managerIds) && {
        managers: { set: managerIds.filter((managerEmployeeId: string) => managerEmployeeId !== id && managerEmployeeId !== (managerId || existing.managerId)).map((managerEmployeeId: string) => ({ id: managerEmployeeId })) },
      }),
      ...(salary !== undefined && { salary: Number(salary) || 0 }),
      ...(bankName !== undefined && {
        bankName: bankName ? String(bankName).trim() || null : null,
      }),
      ...(accountNumber !== undefined && {
        accountNumber: accountNumber ? String(accountNumber).trim() || null : null,
      }),
      ...(nin !== undefined && {
        nin: nin ? String(nin).trim() || null : null,
      }),
      ...(status !== undefined && { status }),
      ...(hireDate !== undefined && {
        hireDate: parseLocalDate(hireDate) ?? existing.hireDate,
      }),
      ...(dateOfBirth !== undefined && {
        dateOfBirth: dateOfBirth ? parseLocalDate(dateOfBirth) : null,
      }),
      ...(cameThroughAgent !== undefined && { cameThroughAgent: Boolean(cameThroughAgent) }),
      ...(cameThroughAgent !== undefined || agentName !== undefined
        ? { agentName: cameThroughAgent ? String(agentName ?? "").trim() || null : null }
        : {}),
    },
    include: {
      department: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { role: true } },
      branch: { select: { id: true, name: true, location: true } },
    },
  });

  if (role && existing.user) {
    const nextRole = normalizeRole(String(role));
    await prisma.user.update({
      where: { id: existing.userId },
      data: {
        role: nextRole as Role,
        ...(email !== undefined && { email }),
      },
    });
  } else if (email !== undefined && existing.user) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { email },
    });
  }

  if (endDate !== undefined) {
    await prisma.$executeRaw`UPDATE "Employee" SET "endDate" = ${parseLocalDate(endDate)} WHERE "id" = ${id}`;
  }

  notifyEmployeeChange(id, "updated");
  await audit({
    actor: session,
    module: "employees",
    action: "UPDATE",
    entityId: id,
    entityLabel: `${employee.firstName} ${employee.lastName}`.trim(),
    meta: { changedFields: Object.keys(body) },
  });

  const pinChanged =
    biometricPin !== undefined || branchId !== undefined || status === "ACTIVE";
  if (pinChanged) {
    void replayUnprocessedPunchesForEmployee(id);
  }

  return NextResponse.json({
    success: true,
    employee: {
      ...employee,
      ...(endDate !== undefined ? { endDate: parseLocalDate(endDate) } : {}),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await canManageEmployee(session, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.employee.findUnique({ where: { id }, include: { user: { select: { companyId: true } } } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await assertEmployeeInCompany(session, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Clear reporting-line references before removing the account so the employee
  // row can be physically deleted without leaving dangling manager assignments.
  await prisma.$transaction(async (tx) => {
    await tx.employee.updateMany({ where: { managerId: id }, data: { managerId: null } });
    const reports = await tx.employee.findMany({
      where: { managers: { some: { id } } },
      select: { id: true },
    });
    for (const report of reports) {
      await tx.employee.update({
        where: { id: report.id },
        data: { managers: { disconnect: { id } } },
      });
    }
    await tx.user.delete({ where: { id: existing.userId } });
  });

  notifyEmployeeChange(id, "deleted");
  await audit({ actor: session, module: "employees", action: "DELETE", entityId: id, entityLabel: `${existing.firstName} ${existing.lastName}`.trim() });
  await notifyCompanyAdminsOfStaffChange({ companyId: existing.user.companyId, employeeName: `${existing.firstName} ${existing.lastName}`.trim(), action: "deleted" });

  return NextResponse.json({ success: true });
}

