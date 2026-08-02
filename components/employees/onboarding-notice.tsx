import { Mail, KeyRound } from "lucide-react";
import { DEFAULT_EMPLOYEE_PASSWORD } from "@/lib/constants/auth";

export function OnboardingPasswordNotice() {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <KeyRound className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-gray-900">Default login password</p>
          <p className="text-[13px] text-gray-600 mt-0.5">
            New accounts are created with temporary password{" "}
            <code className="px-1.5 py-0.5 rounded bg-white border border-violet-100 text-violet-700 font-mono text-[12px]">
              {DEFAULT_EMPLOYEE_PASSWORD}
            </code>
            . The employee can sign in immediately after onboarding.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2 pt-1 border-t border-violet-100/80">
        <Mail className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
        <p className="text-[13px] text-gray-600">
          A welcome email with sign-in details is sent to the work email address as soon as the
          account is created.
        </p>
      </div>
    </div>
  );
}

export type OnboardingSuccess = {
  email: string;
  emailSent: boolean;
  emailError?: string | null;
  emailPreviewUrl?: string;
  employeeId?: string;
};

export function OnboardingSuccessMessage({ result }: { result: OnboardingSuccess }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900 space-y-2">
      <p className="font-semibold">Employee account created</p>
      {result.emailSent ? (
        <p>
          Welcome email sent to <strong>{result.email}</strong> with login details (password{" "}
          <code className="font-mono text-[12px]">{DEFAULT_EMPLOYEE_PASSWORD}</code>).
        </p>
      ) : (
        <p>
          Account created for <strong>{result.email}</strong>, but the welcome email could not be
          sent{result.emailError ? `: ${result.emailError}` : ""}. Share the default password
          manually.
        </p>
      )}
      {result.emailPreviewUrl && (
        <p>
          Dev preview:{" "}
          <a
            href={result.emailPreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-violet-700 underline font-medium"
          >
            View test email
          </a>
        </p>
      )}
    </div>
  );
}
