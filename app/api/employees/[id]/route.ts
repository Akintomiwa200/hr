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
      user: { select: { role: true } },
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
    firstName,
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
    employmentType,
    role,
    salary,
    status,
    hireDate,
    endDate,
  } = body;

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

  const shiftFields =
    isShiftWorker !== undefined || shiftStartTime !== undefined
      ? parseEmployeeShiftFields({ isShiftWorker, shiftStartTime })
      : undefined;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
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
      ...(salary !== undefined && { salary: Number(salary) || 0 }),
      ...(status !== undefined && { status }),
      ...(hireDate !== undefined && {
        hireDate: parseLocalDate(hireDate) ?? existing.hireDate,
      }),
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

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await assertEmployeeInCompany(session, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.employee.update({
    where: { id },
    data: {
      status: "INACTIVE",
      ...(existing.endDate ? {} : { endDate: new Date() }),
    },
  });

  notifyEmployeeChange(id, "deleted");

  return NextResponse.json({ success: true });
}

