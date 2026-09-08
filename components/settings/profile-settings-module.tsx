"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleHelp, ImagePlus, Trash2, UserRound } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { canManageOrgContent, roleLabel } from "@/lib/roles";
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
  dateOfBirth: Date | string | null;
  avatar: string | null;
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
  {
    key: "checklist",
    label: "Checklist task updates",
    desc: "Get notified when tasks are assigned, updated, or completed",
    helpHref: "/help/checklist",
  },
] as const;

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

function SectionHelpLink({
  href,
  label = "Learn more",
  visible,
}: {
  href: string;
  label?: string;
  visible: boolean;
}) {
  if (!visible) return null;
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

export function ProfileSettingsModule({
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
  const [avatar, setAvatar] = useState(employee?.avatar ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    leave: preferences.leave ?? true,
    payroll: preferences.payroll ?? true,
    announcements: preferences.announcements ?? true,
    performance: preferences.performance ?? true,
  });
  const [loading, setLoading] = useState(false);
  const canAccessHelp = canManageOrgContent(role as Role);

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

  const removeAvatar = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/settings/avatar", { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not remove photo"));
        return;
      }
      setAvatar(null);
      notify.success("Profile photo removed");
      router.refresh();
    } catch {
      notify.error("Could not remove photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/settings/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not upload photo"));
        return;
      }
      const data = await res.json();
      setAvatar(data.avatar);
      notify.success("Profile photo updated");
      router.refresh();
    } catch {
      notify.error("Could not upload photo. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="overflow-hidden">
        <CardHeader
          title="Profile information"
          description="Your account and employee details"
          action={<SectionHelpLink href="/help/settings" visible={canAccessHelp} />}
        />
        {employee && (
          <div className="px-6 pt-2 pb-4 flex items-center gap-4 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-violet-50">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserRound className="w-7 h-7 text-violet-600" />
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 disabled:opacity-60"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                {uploading ? "Uploading…" : avatar ? "Change photo" : "Upload photo"}
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 ml-2 text-[13px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
              <p className="text-[11px] text-gray-400 mt-1.5">PNG, JPG or WEBP · max 2 MB</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
            </div>
          </div>
        )}
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
                <dd className="font-medium text-gray-900">{fullName(employee.firstName, employee.lastName)}</dd>
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
              <div className="flex justify-between py-3 border-b border-gray-100">
                <dt className="text-gray-500">Start date</dt>
                <dd className="font-medium text-gray-900">{formatDate(employee.hireDate)}</dd>
              </div>
              {employee.dateOfBirth && (
                <div className="flex justify-between py-3">
                  <dt className="text-gray-500">Date of birth</dt>
                  <dd className="font-medium text-gray-900">{formatDate(employee.dateOfBirth)}</dd>
                </div>
              )}
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
          action={<SectionHelpLink href="/help/settings" label="Notification help" visible={canAccessHelp} />}
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
                  {canAccessHelp && (
                    <Link href={item.helpHref} className="text-[11px] text-violet-600 hover:text-violet-700">
                      Guide
                    </Link>
                  )}
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
  );
}