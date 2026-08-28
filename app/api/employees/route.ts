import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getSession, canManageEmployees } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyEmployeeChange } from "@/lib/employees/mutations";
import { createEmployeeAccount } from "@/lib/employees/create-employee";
import { assertCanAddEmployee, subscriptionErrorMessage } from "@/lib/subscription";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { peopleDirectoryEmployeeWhere } from "@/lib/employee-access";
import { canAssignRole, normalizeRole } from "@/lib/roles";
import { parseLocalDate } from "@/lib/dates";
import { parseEmployeeShiftFields } from "@/lib/employee-shift";
import { replayUnprocessedPunchesForEmployee } from "@/lib/zkteco/service";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const status = request.nextUrl.searchParams.get("status");
  const role = request.nextUrl.searchParams.get("role");

  const scope = getCompanyScope(session);
  const directoryScope = await peopleDirectoryEmployeeWhere(session);
  const orgEmployee = employeeCompanyWhere(scope);

  const employees = await prisma.employee.findMany({
    where: {
      AND: [
        orgEmployee,
        ...(directoryScope ? [directoryScope] : []),
        ...(status && status !== "ALL" ? [{ status }] : []),
        ...(role && role !== "ALL"
          ? [{ user: { role: role as Role } }]
          : []),
        ...(search
          ? [
              {
                OR: [
                  { firstName: { contains: search } },
                  { lastName: { contains: search } },
                  { email: { contains: search } },
                  { employeeCode: { contains: search } },
                ],
              },
            ]
          : []),
      ],
    },
    include: {
      department: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { role: true } },
      branch: { select: { id: true, name: true, location: true } },
    },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !canManageEmployees(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
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
    managerId,
    employmentType = "FULL_TIME",
    role = "EMPLOYEE",
    salary = 0,
    status = "ACTIVE",
    hireDate,
  } = body;

  if (!firstName || !lastName || !email || !jobTitle || !departmentId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const resolvedRole = normalizeRole(String(role || "EMPLOYEE"));
  if (!canAssignRole(session.role, resolvedRole)) {
    return NextResponse.json(
      { error: "You cannot assign that system role" },
      { status: 403 }
    );
  }

  try {
    await assertCanAddEmployee(session.companyId);

    const { employee, email: emailResult } = await createEmployeeAccount({
      firstName,
      lastName,
      email,
      phone,
      address,
      jobTitle,
      departmentId,
      branchId: branchId || null,
      biometricPin: biometricPin || null,
      managerId,
      employmentType,
      role: resolvedRole,
      salary,
      status,
      companyId: session.companyId,
      hireDate,
    });

    const shiftFields = parseEmployeeShiftFields(body);
    if (shiftFields.isShiftWorker) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: shiftFields,
      });
    }

    notifyEmployeeChange(employee.id, "created");

    if (biometricPin || employee.employeeCode) {
      void replayUnprocessedPunchesForEmployee(employee.id);
    }

    const startDate = parseLocalDate(hireDate) ?? employee.hireDate;

    let checklistStarted = false;
    try {
      const { startEmployeeOnboarding } = await import("@/lib/checklist/instantiate");
      const result = await startEmployeeOnboarding({
        employeeId: employee.id,
        companyId: session.companyId ?? null,
        startDate,
      });
      checklistStarted = result.created;
    } catch {
      checklistStarted = false;
    }

    return NextResponse.json({
      success: true,
      employee,
      checklistStarted,
      emailSent: emailResult.sent,
      emailError: emailResult.sent ? null : emailResult.error,
      emailPreviewUrl:
        "previewUrl" in emailResult ? emailResult.previewUrl : undefined,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    if (
      err instanceof Error &&
      ["SUBSCRIPTION_INACTIVE", "SUBSCRIPTION_EXPIRED", "TRIAL_EXPIRED", "EMPLOYEE_LIMIT"].includes(
        err.message
      )
    ) {
      return NextResponse.json(
        { error: subscriptionErrorMessage(err.message) },
        { status: 402 }
      );
    }
    console.error("[employees] create failed:", err);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
