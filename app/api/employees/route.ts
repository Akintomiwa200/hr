import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";

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
    jobTitle,
    departmentId,
    managerId,
    employmentType = "FULL_TIME",
    role = "EMPLOYEE",
    salary = 0,
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
          jobTitle: resolvedJobTitle,
          departmentId,
          managerId: managerId || null,
          hireDate: new Date(),
          salary: Number(salary) || 0,
        },
      },
    },
    include: { employee: true },
  });

  broadcastEvent("employee_updated", { id: user.employee!.id, action: "created" });
  revalidatePath("/employees");
  revalidatePath("/dashboard");

  return NextResponse.json({ success: true, employeeId: user.employee!.id });
}
