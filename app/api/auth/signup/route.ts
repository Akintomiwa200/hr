import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, password } = await request.json();

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    let department = await prisma.department.findFirst({
      orderBy: { name: "asc" },
    });

    if (!department) {
      department = await prisma.department.create({
        data: { name: "General", description: "Default department" },
      });
    }

    const employeeCount = await prisma.employee.count();
    const employeeCode = `EMP${String(employeeCount + 1).padStart(3, "0")}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: Role.EMPLOYEE,
        },
      });

      await tx.employee.create({
        data: {
          userId: createdUser.id,
          employeeCode,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          jobTitle: "Team Member",
          departmentId: department!.id,
          hireDate: new Date(),
        },
      });

      return createdUser;
    });

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    });

    await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: employee?.id,
      firstName: employee?.firstName,
      lastName: employee?.lastName,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
