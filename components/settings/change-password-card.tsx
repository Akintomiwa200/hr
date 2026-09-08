"use client";

import { useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";
import { notify, readApiError } from "@/lib/toast";

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword.length < 8) {
      notify.error("New password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.error("New passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        notify.error(await readApiError(res, "Could not update password."));
        return;
      }

      notify.success("Password updated successfully.");
      resetFields();
    } catch {
      notify.error("Could not update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Change password"
        description="Reset your password from this account, right here in settings"
        action={
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-violet-600" />
          </div>
        }
      />
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label htmlFor="current-password" className="block text-xs font-medium text-gray-600 mb-1.5">
            Current password
          </label>
          <PasswordInput
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            required
            autoComplete="current-password"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="new-password" className="block text-xs font-medium text-gray-600 mb-1.5">
              New password
            </label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-600 mb-1.5">
              Confirm new password
            </label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            This resets your password directly — no email needed.
          </p>
          <Button type="submit" loading={loading}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}