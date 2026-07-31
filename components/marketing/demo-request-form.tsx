"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function DemoRequestForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = email ? `?email=${encodeURIComponent(email)}` : "";
    router.push(`/signup${params}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 w-full max-w-xl mx-auto bg-white rounded-2xl shadow-[0_8px_40px_rgba(123,97,255,0.12)] border border-gray-100 p-2"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        className="flex-1 px-4 py-3.5 text-[14px] text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none rounded-xl"
      />
      <button
        type="submit"
        className="px-6 py-3.5 text-[14px] font-semibold text-white bg-[#7B61FF] rounded-xl hover:bg-[#6b51ef] transition-colors whitespace-nowrap shadow-sm"
      >
        Request a Demo
      </button>
    </form>
  );
}
