import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { employee: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    let isActive = user.isActive;
    if (user.suspendedUntil) {
      if (user.suspendedUntil > new Date()) {
        return NextResponse.json(
          {
            error: `This account is suspended until ${user.suspendedUntil.toISOString().slice(0, 10)}.${user.suspensionReason ? ` Reason: ${user.suspensionReason}` : ""}`,
          },
          { status: 403 }
        );
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { isActive: true, suspendedAt: null, suspendedUntil: null, suspensionReason: null },
        }),
        ...(user.employee
          ? [prisma.employee.update({ where: { id: user.employee.id }, data: { status: "ACTIVE" } })]
          : []),
      ]);
      isActive = true;
    }

    if (!isActive || user.archivedAt) {
      return NextResponse.json(
        {
          error: user.archivedAt
            ? "This account has been archived. Contact your platform administrator."
            : "This account has been deactivated. Contact your platform administrator.",
        },
        { status: 403 }
      );
    }

    await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      employeeId: user.employee?.id,
      firstName: user.employee?.firstName,
      lastName: user.employee?.lastName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
