"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify, readApiError } from "@/lib/toast";
import { PasswordInput } from "@/components/ui/password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (password.length < 8) {
      notify.error("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      notify.error("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        notify.error(await readApiError(res, "Could not reset password"));
        return;
      }

      notify.success("Password updated. Please sign in with your new password.");
      router.push("/login");
      router.refresh();
    } catch {
      notify.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-[13px] font-medium text-gray-700">
          New password
        </label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-[13px] font-medium text-gray-700">
          Confirm new password
        </label>
        <PasswordInput
          id="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter your password"
          required
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-[14px] font-semibold text-white bg-[#7B61FF] rounded-xl hover:bg-[#6b51ef] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
      >
        {loading ? "Updating…" : "Update password"}
      </button>

      <p className="text-center text-[13px] text-gray-500">
        <Link href="/login" className="font-semibold text-[#7B61FF] hover:text-[#6b51ef]">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
