import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { ProfileSettingsModule } from "@/components/settings/profile-settings-module";
import { SuperAdminProfileModule } from "@/components/settings/super-admin-profile-module";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asBooleanMap(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "boolean") result[key] = entry;
  }
  return result;
}

export default async function ProfileSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { email: true, preferences: true, createdAt: true },
  });

  let storedPreferences: Record<string, unknown> = {};
  if (user?.preferences) {
    try {
      const parsed = JSON.parse(user.preferences);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        storedPreferences = parsed;
      }
    } catch {
      storedPreferences = {};
    }
  }

  // Platform Super Admins are not tied to a company/employee record, so their
  // identity lives in User.preferences. Give them the dedicated profile editor.
  if (isSuperAdmin(session.role)) {
    return (
      <SuperAdminProfileModule
        user={{
          id: session.id,
          email: user?.email ?? session.email,
          role: session.role,
          createdAt: user?.createdAt,
          firstName: asString(storedPreferences.firstName),
          lastName: asString(storedPreferences.lastName),
          phone: asString(storedPreferences.phone),
          address: asString(storedPreferences.address),
          jobTitle: asString(storedPreferences.jobTitle),
          bio: asString(storedPreferences.bio),
          avatar: asString(storedPreferences.avatar) ?? session.avatar ?? null,
          preferences: asBooleanMap(storedPreferences.preferences),
        }}
      />
    );
  }

  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          phone: true,
          address: true,
          jobTitle: true,
          hireDate: true,
          dateOfBirth: true,
          avatar: true,
          department: { select: { name: true } },
        },
      })
    : null;

  const preferences = asBooleanMap(storedPreferences);

  return (
    <div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Profile &amp; notifications</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Manage your account details and the updates you receive.
      </p>
      <ProfileSettingsModule
        email={session.email}
        role={session.role}
        employee={employee}
        preferences={preferences}
      />
    </div>
  );
}
