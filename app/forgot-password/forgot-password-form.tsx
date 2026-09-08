"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { notify, readApiError } from "@/lib/toast";

export function ForgotPasswordForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        notify.error(await readApiError(res, "Something went wrong"));
        return;
      }

      setSent(true);
    } catch {
      notify.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#7B61FF]/10">
          <Mail className="h-7 w-7 text-[#7B61FF]" />
        </div>
        <div>
          <h3 className="text-[17px] font-semibold text-gray-900">Check your email</h3>
          <p className="mt-1 text-[13px] text-gray-500">
            If an account exists for{" "}
            <span className="font-medium text-gray-700">{email}</span>, we&apos;ve
            sent a link to reset your password. It expires in 60 minutes.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7B61FF] hover:text-[#6b51ef]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[13px] font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          autoComplete="email"
          className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-[14px] font-semibold text-white bg-[#7B61FF] rounded-xl hover:bg-[#6b51ef] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-[13px] text-gray-500">
        <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-[#7B61FF] hover:text-[#6b51ef]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
