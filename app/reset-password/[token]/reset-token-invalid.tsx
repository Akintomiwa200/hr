import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export function ResetTokenInvalid() {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <AlertTriangle className="h-7 w-7 text-amber-500" />
      </div>
      <div>
        <h3 className="text-[17px] font-semibold text-gray-900">Invalid or expired link</h3>
        <p className="mt-1 text-[13px] text-gray-500">
          This password reset link is invalid or has already been used. Please
          request a new one.
        </p>
      </div>
      <div className="space-y-2">
        <Link
          href="/forgot-password"
          className="block w-full py-3 text-[14px] font-semibold text-white bg-[#7B61FF] rounded-xl hover:bg-[#6b51ef] transition-colors"
        >
          Request a new link
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7B61FF] hover:text-[#6b51ef]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
