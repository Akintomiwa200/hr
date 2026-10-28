"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ImagePlus,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

export type SuperAdminUser = {
  id: string;
  email: string;
  role: string;
  createdAt?: Date | string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  jobTitle?: string;
  bio?: string;
  avatar?: string | null;
  preferences?: {
    systemAlerts?: boolean;
    tenantAlerts?: boolean;
    securityNotices?: boolean;
    billingAlerts?: boolean;
    [key: string]: boolean | undefined;
  };
};

const inputClass =
  "w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-[#7B61FF] focus:ring-2 focus:ring-[#7B61FF]/15 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";

export function SuperAdminProfileModule({ user }: { user: SuperAdminUser }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Form states
  const [firstName, setFirstName] = useState(user.firstName || "Super");
  const [lastName, setLastName] = useState(user.lastName || "Admin");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [address, setAddress] = useState(user.address || "");
  const [jobTitle, setJobTitle] = useState(
    user.jobTitle || "Platform Super Administrator"
  );
  const [bio, setBio] = useState(
    user.bio ||
      "Global platform administrator with unrestricted access across all system entities, settings, and tenants."
  );
  const [avatar, setAvatar] = useState<string | null>(user.avatar || null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    systemAlerts: user.preferences?.systemAlerts ?? true,
    tenantAlerts: user.preferences?.tenantAlerts ?? true,
    securityNotices: user.preferences?.securityNotices ?? true,
    billingAlerts: user.preferences?.billingAlerts ?? true,
  });

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim() || "Super Admin";

  // Upload or update avatar in real time
  const handleUploadPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      notify.error("Please upload a valid image file (PNG, JPG, or WEBP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify.error("Photo must be smaller than 2 MB.");
      return;
    }

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
      notify.success("Profile photo updated in real time!");
      router.refresh();
    } catch {
      notify.error("Could not upload photo. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Remove avatar in real time
  const handleRemovePhoto = async () => {
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

  // Save all profile details (aside from role)
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      notify.error("First name and last name are required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      notify.error("Please provide a valid email address.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: address.trim(),
          jobTitle: jobTitle.trim(),
          bio: bio.trim(),
          preferences: notifications,
        }),
      });

      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update profile"));
        return;
      }

      notify.success("Super Admin profile saved successfully!");
      router.refresh();
    } catch {
      notify.error("Could not save profile. Please check your connection.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      notify.error("Current password is required.");
      return;
    }
    if (newPassword.length < 6) {
      notify.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.error("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        notify.error(await readApiError(res, "Password update failed"));
        return;
      }

      notify.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      notify.error("Could not update password. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button and page intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-gray-500 hover:text-[#7B61FF] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to settings
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Super Admin Profile
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-600 text-white shadow-sm">
              <Sparkles className="w-3 h-3 text-violet-200" />
              ROOT ACCOUNT
            </span>
          </div>
          <p className="text-[13px] text-gray-500 mt-1">
            Global root identity and administrative settings. All profile attributes update in real time across the platform.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => handleSaveProfile()}
          loading={savingProfile}
          className="bg-[#7B61FF] hover:bg-[#6d54e8] text-white font-semibold text-[13px] rounded-xl shadow-sm self-start sm:self-auto"
        >
          <Save className="w-4 h-4 mr-1.5" />
          Save Changes
        </Button>
      </div>

      {/* Hero Card: Avatar & Live Identity */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-purple-50/40 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with photo action overlay */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 ring-4 ring-violet-500/10 shadow-md flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img
                  src={avatar}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold shadow-inner">
                  {firstName.charAt(0).toUpperCase()}
                  {lastName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Platform root shield badge */}
            <span
              className="absolute -bottom-1 -right-1 bg-violet-700 text-white p-1.5 rounded-xl shadow-md border-2 border-white"
              title="Platform Super Admin"
            >
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>

          {/* Quick Details & Photo Actions */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Active
              </span>
            </div>

            <p className="text-[13px] font-medium text-violet-700">{jobTitle}</p>
            <p className="text-[12px] text-gray-500">{email}</p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-semibold text-white bg-[#7B61FF] hover:bg-[#6d54e8] rounded-xl shadow-sm transition-colors disabled:opacity-60"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                {uploading ? "Updating photo..." : avatar ? "Change Picture" : "Upload Picture"}
              </button>

              {avatar && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-xl transition-colors disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUploadPhoto(f);
                }}
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Recommended: Square JPG, PNG, or WEBP (up to 2 MB). Changes apply live.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Section (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Administrator Details"
              description="Personal information and contact credentials (all editable aside from role)."
            />

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {/* Role Display - Non-editable / Locked */}
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        System Role (Non-Editable)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        Permanent Platform Root
                      </span>
                    </div>
                    <p className="text-[14px] font-bold text-gray-900 mt-0.5">
                      SUPER ADMIN
                    </p>
                    <p className="text-[12px] text-amber-900/80 mt-1 leading-relaxed">
                      This account holds root platform privileges. The role is intentionally non-editable to prevent administrative lockout and preserve system integrity.
                    </p>
                  </div>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    First Name
                  </span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Super"
                    className={inputClass}
                    required
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    Last Name
                  </span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Admin"
                    className={inputClass}
                    required
                  />
                </label>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    Email Address (Login Username)
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@smarthr.com"
                    className={inputClass}
                    required
                  />
                  <span className="block text-[11px] text-gray-400">
                    Used to authenticate as Platform Super Admin.
                  </span>
                </label>

                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    Phone Number
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 012-3456"
                    className={inputClass}
                  />
                </label>
              </div>

              {/* Title & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
                    <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                    Platform Title
                  </span>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Platform Super Administrator"
                    className={inputClass}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    Office / Headquarters Location
                  </span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Global HQ, Silicon Valley, CA"
                    className={inputClass}
                  />
                </label>
              </div>

              {/* Bio */}
              <label className="block space-y-1.5">
                <span className="text-[12px] font-medium text-gray-700">
                  Administrative Bio / Notes
                </span>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Notes on platform administration, responsibilities, or contact directives."
                  className={cn(inputClass, "resize-y")}
                />
              </label>

              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  loading={savingProfile}
                  className="bg-[#7B61FF] hover:bg-[#6d54e8] text-white font-semibold text-[13px] rounded-xl px-5 py-2.5 shadow-sm"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Profile Details
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Security & Preferences */}
        <div className="space-y-6">
          {/* Change Password Card */}
          <Card>
            <CardHeader
              title="Change Password"
              description="Update your Super Admin access credentials"
            />
            <form onSubmit={handleChangePassword} className="p-6 space-y-3.5">
              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-gray-700">
                  Current Password
                </span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-gray-700">
                  New Password
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={inputClass}
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-gray-700">
                  Confirm New Password
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={inputClass}
                  required
                />
              </label>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="secondary"
                  loading={savingPassword}
                  className="w-full justify-center text-[13px] font-semibold border-gray-200 hover:bg-violet-50 hover:text-[#7B61FF] rounded-xl"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  Update Password
                </Button>
              </div>
            </form>
          </Card>

          {/* System Notification Toggles */}
          <Card>
            <CardHeader
              title="Platform Alerts"
              description="System events and high-priority notifications"
            />
            <div className="p-6 space-y-4">
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-[13px] font-medium text-gray-900">
                    System Critical Alerts
                  </p>
                  <p className="text-[11.5px] text-gray-500">
                    Database sync, errors, and system incidents
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.systemAlerts}
                  onChange={(e) =>
                    setNotifications((n) => ({ ...n, systemAlerts: e.target.checked }))
                  }
                  className="h-4 w-4 rounded text-[#7B61FF] focus:ring-[#7B61FF] mt-1"
                />
              </label>

              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-[13px] font-medium text-gray-900">
                    Tenant &amp; Company Signups
                  </p>
                  <p className="text-[11.5px] text-gray-500">
                    Notifications when new companies register
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.tenantAlerts}
                  onChange={(e) =>
                    setNotifications((n) => ({ ...n, tenantAlerts: e.target.checked }))
                  }
                  className="h-4 w-4 rounded text-[#7B61FF] focus:ring-[#7B61FF] mt-1"
                />
              </label>

              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-[13px] font-medium text-gray-900">
                    Security &amp; Audit Notices
                  </p>
                  <p className="text-[11.5px] text-gray-500">
                    Failed logins and privilege modifications
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.securityNotices}
                  onChange={(e) =>
                    setNotifications((n) => ({
                      ...n,
                      securityNotices: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded text-[#7B61FF] focus:ring-[#7B61FF] mt-1"
                />
              </label>

              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-[13px] font-medium text-gray-900">
                    Subscription &amp; Billing
                  </p>
                  <p className="text-[11.5px] text-gray-500">
                    Tenant subscription changes and payments
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.billingAlerts}
                  onChange={(e) =>
                    setNotifications((n) => ({
                      ...n,
                      billingAlerts: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded text-[#7B61FF] focus:ring-[#7B61FF] mt-1"
                />
              </label>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSaveProfile()}
                  loading={savingProfile}
                  className="w-full justify-center text-[13px] font-semibold border-gray-200 hover:bg-gray-50 rounded-xl"
                >
                  <Bell className="w-3.5 h-3.5 mr-1.5" />
                  Save Preferences
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
