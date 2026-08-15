"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify, readApiError } from "@/lib/toast";
import { PasswordInput } from "@/components/ui/password-input";

export function SignupForm({
  initialEmail = "",
  selectedPlanName,
  planId,
}: {
  initialEmail?: string;
  selectedPlanName?: string;
  planId?: string;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      notify.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      notify.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, plan: planId }),
      });

      if (!res.ok) {
        notify.error(await readApiError(res, "Signup failed"));
        return;
      }

      notify.success("Account created successfully. Welcome to Smart HR!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      notify.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {selectedPlanName ? (
        <p className="text-[13px] text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
          Selected plan: <strong>{selectedPlanName}</strong> — pricing syncs with your dashboard after signup.
        </p>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="block text-[13px] font-medium text-gray-700">
            First name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
            required
            className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="block text-[13px] font-medium text-gray-700">
            Last name
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            required
            className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[13px] font-medium text-gray-700">
          Work email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-[13px] font-medium text-gray-700">
          Password
        </label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-gray-700">
          Confirm password
        </label>
        <PasswordInput
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-[14px] font-semibold text-white bg-[#7B61FF] rounded-xl hover:bg-[#6b51ef] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
      >
        {loading ? "Creating account..." : "Start free trial"}
      </button>

      <p className="text-center text-[12px] text-gray-400 leading-relaxed">
        By signing up, you agree to our{" "}
        <Link href="/terms" className="text-[#7B61FF] hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-[#7B61FF] hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="text-center text-[13px] text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#7B61FF] hover:text-[#6b51ef]">
          Sign in
        </Link>
      </p>
    </form>
  );
}
