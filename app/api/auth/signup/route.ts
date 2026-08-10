import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { defaultTrialCompanyData } from "@/lib/subscription";
import { getPlan, type SubscriptionPlanId } from "@/lib/subscription-plans";
import { defaultPayrollSettings } from "@/lib/payroll-types";
import { nextEmployeeCode } from "@/lib/employees/next-employee-code";

function slugFromEmail(email: string) {
  const base = email.split("@")[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `${base}-${Date.now().toString(36)}`;
}

function resolveSignupPlan(plan?: string): SubscriptionPlanId {
  const valid = ["basic", "pro", "advanced", "trial"] as const;
  if (plan && valid.includes(plan as (typeof valid)[number])) {
    return plan as SubscriptionPlanId;
  }
  return "trial";
}

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, password, plan: planParam } = await request.json();

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
    const planId = resolveSignupPlan(planParam);
    const plan = getPlan(planId);

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const trial = defaultTrialCompanyData();
    const companyName = `${firstName.trim()}'s Organization`;

    const user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug: slugFromEmail(normalizedEmail),
          plan: planId === "trial" ? "trial" : planId,
          subscriptionStatus: trial.subscriptionStatus,
          trialEndsAt: trial.trialEndsAt,
          currentPeriodEnd: trial.currentPeriodEnd,
          billingEmail: normalizedEmail,
          isActive: true,
        },
      });

      const department = await tx.department.create({
        data: {
          name: "General",
          description: "Default department",
          companyId: company.id,
        },
      });

      await tx.payrollSettings.create({
        data: { companyId: company.id, ...defaultPayrollSettings },
      });

      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: Role.COMPANY_ADMIN,
          companyId: company.id,
        },
      });

      const employeeCode = await nextEmployeeCode(tx);

      await tx.employee.create({
        data: {
          userId: createdUser.id,
          employeeCode,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          jobTitle: plan.name === "Enterprise" ? "Administrator" : "Company Admin",
          departmentId: department.id,
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
      companyId: user.companyId,
      employeeId: employee?.id,
      firstName: employee?.firstName,
      lastName: employee?.lastName,
    });

    return NextResponse.json({ success: true, plan: planId });
  } catch (error) {
    console.error("[signup]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
