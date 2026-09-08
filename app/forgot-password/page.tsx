import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Reset Password — Smart HR",
  description: "Request a password reset link for your Smart HR account",
};

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email address associated with your account and we'll send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
