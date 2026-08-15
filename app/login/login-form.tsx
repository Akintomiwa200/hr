"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify, readApiError } from "@/lib/toast";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        notify.error(await readApiError(res, "Login failed"));
        return;
      }

      notify.success("Welcome back!");
      router.push("/dashboard");
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
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-[14px] font-semibold text-white bg-[#7B61FF] rounded-xl hover:bg-[#6b51ef] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-[13px] text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-[#7B61FF] hover:text-[#6b51ef]">
          Start free trial
        </Link>
      </p>
    </form>
  );
}
