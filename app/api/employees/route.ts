import { NextRequest, NextResponse } from "next/server";
import { getSession, canManageEmployees } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyEmployeeChange } from "@/lib/employees/mutations";
import { createEmployeeAccount } from "@/lib/employees/create-employee";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const status = request.nextUrl.searchParams.get("status");
  const role = request.nextUrl.searchParams.get("role");

  const employees = await prisma.employee.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(role && role !== "ALL"
        ? { user: { role: role as "ADMIN" | "MANAGER" | "EMPLOYEE" } }
        : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { employeeCode: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      department: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { role: true } },
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
    managerId,
    employmentType = "FULL_TIME",
    role = "EMPLOYEE",
    salary = 0,
    status = "ACTIVE",
  } = body;

  if (!firstName || !lastName || !email || !jobTitle || !departmentId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { employee, email: emailResult } = await createEmployeeAccount({
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
    });

    notifyEmployeeChange(employee.id, "created");

    return NextResponse.json({
      success: true,
      employee,
      emailSent: emailResult.sent,
      emailError: emailResult.sent ? null : emailResult.error,
      emailPreviewUrl:
        "previewUrl" in emailResult ? emailResult.previewUrl : undefined,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error("[employees] create failed:", err);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
