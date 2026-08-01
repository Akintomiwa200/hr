import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyEmployeeChange } from "@/lib/employees/mutations";

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
  if (!session || session.role !== "ADMIN") {
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

  const resolvedJobTitle =
    employmentType === "FREELANCE" && !jobTitle.toLowerCase().includes("freelance")
      ? `${jobTitle} (Freelance)`
      : jobTitle;

  if (!firstName || !lastName || !email || !jobTitle || !departmentId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const count = await prisma.employee.count();
  const employeeCode = `EMP${String(count + 1).padStart(3, "0")}`;
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: role as Role,
      employee: {
        create: {
          employeeCode,
          firstName,
          lastName,
          email,
          phone: phone || null,
          address: address || null,
          jobTitle: resolvedJobTitle,
          departmentId,
          managerId: managerId || null,
          hireDate: new Date(),
          salary: Number(salary) || 0,
          status,
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

  notifyEmployeeChange(user.employee!.id, "created");

  return NextResponse.json({ success: true, employee: user.employee });
}
