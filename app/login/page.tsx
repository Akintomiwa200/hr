import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export const metadata = {
  title: "Sign In — Smart HR",
  description: "Sign in to your Smart HR account",
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { email } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account to continue to your dashboard."
    >
      <LoginForm initialEmail={email ?? ""} />
    </AuthShell>
  );
}
