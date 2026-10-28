import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { ORG_ROLES } from "@/lib/roles";

type AccountAction = "deactivate" | "reactivate" | "archive" | "restore";

const ACTION_LABELS: Record<AccountAction, string> = {
  deactivate: "deactivated",
  reactivate: "reactivated",
  archive: "archived",
  restore: "restored",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadTarget(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      archivedAt: true,
      employee: { select: { id: true, email: true } },
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.id) {
    return NextResponse.json(
      { error: "You cannot change your own account from this page." },
      { status: 400 }
    );
  }

  const target = await loadTarget(id);
  if (!target) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super admin accounts cannot be managed from this page." },
      { status: 403 }
    );
  }

  let body: {
    action?: AccountAction;
    email?: unknown;
    role?: unknown;
    firstName?: unknown;
    lastName?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Lifecycle actions (deactivate / reactivate / archive / restore).
  if (body.action) {
    const action = body.action;
    if (!(action in ACTION_LABELS)) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const data =
      action === "deactivate"
        ? { isActive: false }
        : action === "archive"
          ? { isActive: false, archivedAt: new Date() }
          : { isActive: true, archivedAt: null };

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, isActive: true, archivedAt: true },
    });

    broadcastAppEvent("dashboard_updated", { source: "platform_user_lifecycle", userId: id });

    return NextResponse.json({
      ok: true,
      message: `${target.email} ${ACTION_LABELS[action]}`,
      user: updated,
    });
  }

  // Profile edits (name / email / role).
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const role = typeof body.role === "string" ? body.role : undefined;
  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : undefined;
  const lastName =
    typeof body.lastName === "string" ? body.lastName.trim() : undefined;

  const hasNameChange = firstName !== undefined || lastName !== undefined;
  if (!email && !role && !hasNameChange) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (role && !ORG_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Choose a valid company role" }, { status: 400 });
  }
  if (hasNameChange && !target.employee) {
    return NextResponse.json(
      { error: "This account has no employee profile to rename." },
      { status: 400 }
    );
  }
  if (
    (firstName !== undefined && !firstName) ||
    (lastName !== undefined && !lastName)
  ) {
    return NextResponse.json(
      { error: "First and last name are required" },
      { status: 400 }
    );
  }

  if (email && email !== target.email) {
    const clash = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: "Another account already uses that email address." },
        { status: 409 }
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const userData: { email?: string; role?: Role } = {};
      if (email) userData.email = email;
      if (role) userData.role = role as Role;
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id }, data: userData });
      }

      if (target.employee) {
        const employeeData: {
          firstName?: string;
          lastName?: string;
          email?: string;
        } = {};
        if (firstName) employeeData.firstName = firstName;
        if (lastName) employeeData.lastName = lastName;

        // Keep the employee contact email in step when it mirrored the login
        // email or was the generated placeholder used for email-less imports.
        if (
          email &&
          email !== target.email &&
          (target.employee.email === target.email ||
            target.employee.email.endsWith("@no-email.local"))
        ) {
          const employeeClash = await tx.employee.findFirst({
            where: { email, NOT: { id: target.employee.id } },
            select: { id: true },
          });
          if (!employeeClash) employeeData.email = email;
        }

        if (Object.keys(employeeData).length > 0) {
          await tx.employee.update({
            where: { id: target.employee.id },
            data: employeeData,
          });
        }
      }
    });
  } catch (error) {
    console.error("Failed to update platform user", error);
    return NextResponse.json(
      { error: "Could not update this account. Check the details and try again." },
      { status: 500 }
    );
  }

  broadcastAppEvent("dashboard_updated", { source: "platform_user_updated", userId: id });

  return NextResponse.json({ ok: true, message: `${email ?? target.email} updated` });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  const target = await loadTarget(id);
  if (!target) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super admin accounts cannot be deleted from this page." },
      { status: 403 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Support history has required author relations that do not cascade, so
      // re-attribute it to the acting super admin instead of losing the thread.
      await tx.supportMessage.updateMany({
        where: { authorId: id },
        data: { authorId: session.id },
      });
      await tx.supportTicket.updateMany({
        where: { authorId: id },
        data: { authorId: session.id },
      });

      // Deleting the user cascades their employee record, notifications,
      // notes, and password reset tokens.
      await tx.user.delete({ where: { id } });
    });
  } catch (error) {
    console.error("Failed to delete platform user", error);
    return NextResponse.json(
      {
        error:
          "This account still has related records that block permanent deletion. Archive the account instead.",
      },
      { status: 409 }
    );
  }

  broadcastAppEvent("dashboard_updated", { source: "platform_user_deleted", userId: id });

  return NextResponse.json({ ok: true, message: `${target.email} permanently deleted` });
}
