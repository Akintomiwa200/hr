import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const {
    phone,
    address,
    preferences,
    firstName,
    lastName,
    email,
    jobTitle,
    bio,
    currentPassword,
    newPassword,
  } = body;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
  });
  if (!user) return unauthorized();

  // Handle password update if requested
  if (newPassword) {
    if (!currentPassword) {
      return badRequest("Current password is required to set a new password.");
    }
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return badRequest("Current password is incorrect.");
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return badRequest("New password must be at least 6 characters.");
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: newHash },
    });
  }

  // Handle email update if requested
  if (email && typeof email === "string" && email.trim().toLowerCase() !== user.email.toLowerCase()) {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing && existing.id !== session.id) {
      return badRequest("This email is already registered to another account.");
    }
    await prisma.user.update({
      where: { id: session.id },
      data: { email: cleanEmail },
    });
  }

  // Handle employee record update if account is linked to an employee
  if (session.employeeId) {
    await prisma.employee.update({
      where: { id: session.employeeId },
      data: {
        ...(firstName !== undefined && { firstName: firstName.trim() }),
        ...(lastName !== undefined && { lastName: lastName.trim() }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
      },
    });
    broadcastAppEvent("employee_updated", { employeeId: session.employeeId });
  }

  // Update User preferences for custom attributes (Super Admin details, notes, notifications)
  let userPrefs: Record<string, unknown> = {};
  if (user.preferences) {
    try {
      userPrefs = JSON.parse(user.preferences);
    } catch {
      userPrefs = {};
    }
  }

  if (firstName !== undefined) userPrefs.firstName = firstName.trim();
  if (lastName !== undefined) userPrefs.lastName = lastName.trim();
  if (phone !== undefined) userPrefs.phone = phone.trim();
  if (address !== undefined) userPrefs.address = address.trim();
  if (jobTitle !== undefined) userPrefs.jobTitle = jobTitle.trim();
  if (bio !== undefined) userPrefs.bio = bio.trim();
  if (preferences !== undefined) {
    userPrefs.preferences = preferences;
  }

  await prisma.user.update({
    where: { id: session.id },
    data: { preferences: JSON.stringify(userPrefs) },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  revalidatePath("/");
  broadcastAppEvent("settings_updated", { userId: session.id });

  return NextResponse.json({ success: true });
}
