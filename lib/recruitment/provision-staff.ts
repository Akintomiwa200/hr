import { Role } from "@prisma/client";
import { createEmployeeAccount } from "@/lib/employees/create-employee";
import { notifyEmployeeChange } from "@/lib/employees/mutations";
import { isApplicationActivityReady, prisma } from "@/lib/prisma";
import { assertCanAddEmployee } from "@/lib/subscription";
import { fullName } from "@/lib/utils";
import type { HiringTeamMember } from "@/lib/recruitment/constants";

async function logOnboardingActivity(input: {
  applicationId: string;
  title: string;
  message?: string;
  actorName?: string;
}) {
  if (!isApplicationActivityReady()) return;
  await prisma.applicationActivity.create({
    data: {
      applicationId: input.applicationId,
      type: "onboarding",
      title: input.title,
      message: input.message ?? null,
      actorName: input.actorName ?? null,
    },
  });
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "Team",
    lastName: parts.slice(1).join(" ") || "Member",
  };
}

/** Create staff account + welcome email when a candidate is marked Hired. */
export async function onboardHiredCandidate(applicationId: string, actorName?: string) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!application) return { onboarded: false as const, reason: "not_found" };
  if (application.status !== "HIRED") return { onboarded: false as const, reason: "not_hired" };

  const email = application.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    await logOnboardingActivity({
      applicationId,
      title: "Staff account already exists",
      message: `${email} already has a Smart HR login.`,
      actorName,
    });
    return { onboarded: false as const, reason: "already_exists" };
  }

  try {
    if (application.job.companyId) {
      await assertCanAddEmployee(application.job.companyId);
    }

    const { employee, email: emailResult } = await createEmployeeAccount({
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      phone: application.phone,
      jobTitle: application.job.title,
      departmentId: application.job.departmentId,
      companyId: application.job.companyId,
      role: Role.EMPLOYEE,
    });

    notifyEmployeeChange(employee.id, "created");

    try {
      const { startEmployeeOnboarding } = await import("@/lib/checklist/instantiate");
      await startEmployeeOnboarding({
        employeeId: employee.id,
        companyId: application.job.companyId,
      });
      await logOnboardingActivity({
        applicationId,
        title: "Onboarding checklist started",
        message: "Default onboarding tasks were created for the new hire.",
        actorName,
      });
    } catch (checklistErr) {
      const message =
        checklistErr instanceof Error ? checklistErr.message : "Checklist start failed";
      await logOnboardingActivity({
        applicationId,
        title: "Onboarding checklist not started",
        message,
        actorName,
      });
    }

    await logOnboardingActivity({
      applicationId,
      title: "Staff account created",
      message: emailResult.sent
        ? `Welcome email sent to ${email} with login details.`
        : `Account created for ${email}. Welcome email could not be sent — share login details manually.`,
      actorName,
    });

    return {
      onboarded: true as const,
      employeeId: employee.id,
      emailSent: emailResult.sent,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onboarding failed";
    await logOnboardingActivity({
      applicationId,
      title: "Onboarding failed",
      message,
      actorName,
    });
    return { onboarded: false as const, reason: message };
  }
}

/** Ensure hiring team members have staff accounts; send welcome emails to new invites. */
export async function resolveHiringTeamMembers(
  members: HiringTeamMember[],
  context: {
    companyId: string | null;
    departmentId: string;
    jobTitle: string;
    role?: Role;
  }
): Promise<HiringTeamMember[]> {
  const resolved: HiringTeamMember[] = [];

  for (const member of members) {
    const email = member.email?.trim().toLowerCase();
    if (!email) continue;

    let employee =
      member.id && !member.id.startsWith("invite:")
        ? await prisma.employee.findUnique({ where: { id: member.id } })
        : null;

    if (!employee) {
      employee = await prisma.employee.findFirst({ where: { email } });
    }

    if (employee) {
      resolved.push({
        id: employee.id,
        name: fullName(employee.firstName, employee.lastName),
        email: employee.email,
      });
      continue;
    }

    const { firstName, lastName } = splitName(member.name);

    try {
      if (context.companyId) {
        await assertCanAddEmployee(context.companyId);
      }

      const { employee: created } = await createEmployeeAccount({
        firstName,
        lastName,
        email,
        jobTitle: `Hiring — ${context.jobTitle}`,
        departmentId: context.departmentId,
        companyId: context.companyId,
        role: context.role ?? Role.MANAGER,
      });

      notifyEmployeeChange(created.id, "created");
      resolved.push({
        id: created.id,
        name: fullName(created.firstName, created.lastName),
        email: created.email,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_EXISTS") {
        const existing = await prisma.employee.findFirst({ where: { email } });
        if (existing) {
          resolved.push({
            id: existing.id,
            name: fullName(existing.firstName, existing.lastName),
            email: existing.email,
          });
        }
      }
    }
  }

  return resolved;
}
