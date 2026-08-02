"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CircleHelp,
  ExternalLink,
  Mail,
  MessageSquare,
  Shield,
  UserRound,
} from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { canManageDevices, roleLabel } from "@/lib/roles";
import type { Role } from "@prisma/client";

type EmployeeProfile = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  phone: string | null;
  address: string | null;
  jobTitle: string;
  hireDate: Date | string;
  department: { name: string };
};

const NOTIFICATION_KEYS = [
  {
    key: "leave",
    label: "Leave request updates",
    desc: "Get notified when leave is approved or rejected",
    helpHref: "/help/leave",
  },
  {
    key: "payroll",
    label: "Payroll notifications",
    desc: "Receive alerts when payslips are available",
    helpHref: "/help/payroll",
  },
  {
    key: "announcements",
    label: "Company announcements",
    desc: "Stay updated with company news",
    helpHref: "/help/announcements",
  },
  {
    key: "performance",
    label: "Performance reviews",
    desc: "Notifications for review cycles",
    helpHref: "/help/performance",
  },
] as const;

const quickHelpLinks = [
  { href: "/help/getting-started", label: "Getting started" },
  { href: "/help/roles-permissions", label: "Roles & permissions" },
  { href: "/help/settings", label: "Settings guide" },
  { href: "/help/contact", label: "Contact support" },
];

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

function SectionHelpLink({ href, label = "Learn more" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700"
    >
      <CircleHelp className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

export function SettingsModule({
  email,
  role,
  employee,
  preferences,
}: {
  email: string;
  role: string;
  employee: EmployeeProfile | null;
  preferences: Record<string, boolean>;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [address, setAddress] = useState(employee?.address ?? "");
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    leave: preferences.leave ?? true,
    payroll: preferences.payroll ?? true,
    announcements: preferences.announcements ?? true,
    performance: preferences.performance ?? true,
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, address, preferences: prefs }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not save preferences. Please try again."));
        return;
      }
      notify.success("Preferences saved successfully");
      router.refresh();
    } catch {
      notify.error("Could not save preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader
            title="Profile information"
            description="Your account and employee details"
            action={<SectionHelpLink href="/help/settings" />}
          />
          <dl className="px-6 pb-2 space-y-0 text-sm">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{email}</dd>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <dt className="text-gray-500">Role</dt>
              <dd className="font-medium text-gray-900">{roleLabel(role as Role)}</dd>
            </div>
            {employee && (
              <>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <dt className="text-gray-500">Full name</dt>
                  <dd className="font-medium text-gray-900">
                    {fullName(employee.firstName, employee.lastName)}
                  </dd>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <dt className="text-gray-500">Job title</dt>
                  <dd className="font-medium text-gray-900">{employee.jobTitle}</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <dt className="text-gray-500">Employee code</dt>
                  <dd className="font-medium text-gray-900 font-mono text-xs">{employee.employeeCode}</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <dt className="text-gray-500">Department</dt>
                  <dd className="font-medium text-gray-900">{employee.department.name}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-gray-500">Hire date</dt>
                  <dd className="font-medium text-gray-900">{formatDate(employee.hireDate)}</dd>
                </div>
              </>
            )}
          </dl>

          {employee ? (
            <div className="p-6 pt-4 space-y-4 border-t border-gray-100">
              <div>
                <label className="text-xs font-medium text-gray-600">Phone</label>
                <input
                  className={`${inputClass} mt-1`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your contact number"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Address</label>
                <textarea
                  className={`${inputClass} mt-1 resize-y`}
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your address"
                />
              </div>
            </div>
          ) : (
            <div className="px-6 pb-6 pt-2">
              <p className="text-sm text-gray-500">
                No employee record is linked to this account. Profile fields are view-only.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Notifications"
            description="Choose which updates you receive"
            action={<SectionHelpLink href="/help/settings" label="Notification help" />}
          />
          <div className="p-6 space-y-1">
            {NOTIFICATION_KEYS.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <Link
                      href={item.helpHref}
                      className="text-[11px] text-violet-600 hover:text-violet-700"
                    >
                      Guide
                    </Link>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs[item.key] ?? true}
                    onChange={(e) => setPrefs({ ...prefs, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-violet-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
                </label>
              </div>
            ))}

            <div className="pt-5 flex flex-wrap items-center gap-3">
              <Button loading={loading} onClick={save}>
                Save preferences
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
            <Shield className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Account security</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Email and role changes are handled by your HR administrator. For access issues, contact support.
          </p>
          <Link
            href="/help/roles-permissions"
            className="text-sm font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
          >
            Roles guide <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </Card>

        <Card className="p-6">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center mb-4">
            <UserRound className="w-5 h-5 text-sky-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Employee profile</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            View attendance, leave, and payroll from your employee profile pages in the directory.
          </p>
          {employee ? (
            <Link
              href={`/employees/${employee.id}`}
              className="text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              Open my profile
            </Link>
          ) : (
            <Link
              href="/help/employees"
              className="text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              Employees guide
            </Link>
          )}
        </Card>

        {canManageDevices(role as Role) && (
          <Card className="p-6 bg-brand-50/50 border-brand-100 lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">API & device integration</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
                    Full REST reference, attendance device endpoints, SSE realtime events, and kiosk setup console.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  href="/api"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-xl hover:bg-brand-600"
                >
                  API reference
                </Link>
                <Link
                  href="/attendance/devices"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-600 bg-white border border-brand-200 rounded-xl hover:bg-brand-50"
                >
                  Device console
                </Link>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-violet-50/50 border-violet-100">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-4">
            <Bell className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Need help?</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Browse guides or reach support without leaving Settings.
          </p>
          <Link
            href="/help/contact"
            className="text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            Contact support
          </Link>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-violet-50/80 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-violet-600 mb-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Help Center</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Guides & support</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                Documentation for every Smart HR module, searchable from one place.
              </p>
            </div>
            <Link
              href="/help"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors shrink-0"
            >
              Open Help Center
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickHelpLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl hover:bg-violet-50 hover:text-violet-700 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="px-6 pb-6 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <a
            href="mailto:support@smarthr.com"
            className="inline-flex items-center gap-2 hover:text-gray-900 transition-colors"
          >
            <Mail className="w-4 h-4" />
            support@smarthr.com
          </a>
        </div>
      </Card>
    </div>
  );
}
