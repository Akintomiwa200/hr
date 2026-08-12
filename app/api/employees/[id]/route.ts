import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEmployee, canViewEmployee } from "@/lib/employee-access";
import { notifyEmployeeChange } from "@/lib/employees/mutations";
import { canAssignRole, normalizeRole } from "@/lib/roles";

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
  if (!session || !(await canManageEmployee(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    jobTitle,
    departmentId,
    managerId,
    employmentType,
    role,
    salary,
    status,
  } = body;

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
      ...(managerId !== undefined && { managerId: managerId || null }),
      ...(salary !== undefined && { salary: Number(salary) || 0 }),
      ...(status !== undefined && { status }),
    },
    include: {
      department: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { role: true } },
    },
  });

  if (role && existing.user) {
    const nextRole = normalizeRole(String(role));
    if (!canAssignRole(session.role, nextRole)) {
      return NextResponse.json(
        { error: "You cannot assign that system role" },
        { status: 403 }
      );
    }
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

  notifyEmployeeChange(id, "updated");

  return NextResponse.json({ success: true, employee });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !(await canManageEmployee(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.employee.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  notifyEmployeeChange(id, "deleted");

  return NextResponse.json({ success: true });
}
