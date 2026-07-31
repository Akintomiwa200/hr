import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "./signup-form";

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export const metadata = {
  title: "Start Free Trial — Smart HR",
  description: "Create your Smart HR account and start your free trial",
};

export default async function SignupPage({ searchParams }: Props) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { email } = await searchParams;

  return (
    <AuthShell
      title="Start your free trial"
      subtitle="Create an account in minutes. No credit card required."
    >
      <SignupForm initialEmail={email ?? ""} />
    </AuthShell>
  );
}
