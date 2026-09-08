import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { validateResetToken } from "@/lib/password-reset";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";
import { ResetTokenInvalid } from "./reset-token-invalid";

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata = {
  title: "Set a New Password — Smart HR",
  description: "Choose a new password for your Smart HR account",
};

export default async function ResetPasswordPage({ params }: Props) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { token } = await params;
  const userId = await validateResetToken(token);

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password for your Smart HR account."
    >
      {userId ? (
        <ResetPasswordForm token={token} />
      ) : (
        <ResetTokenInvalid />
      )}
    </AuthShell>
  );
}
