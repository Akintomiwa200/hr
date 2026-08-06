import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "./signup-form";

import { getPlan } from "@/lib/subscription-plans";

type Props = {
  searchParams: Promise<{ email?: string; plan?: string }>;
};

export const metadata = {
  title: "Start Free Trial — Smart HR",
  description: "Create your Smart HR account and start your free trial",
};

export default async function SignupPage({ searchParams }: Props) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { email, plan } = await searchParams;
  const selectedPlan = plan ? getPlan(plan) : null;

  return (
    <AuthShell
      title="Start your free trial"
      subtitle={
        selectedPlan && selectedPlan.id !== "trial"
          ? `Create an account — ${selectedPlan.name} plan (${selectedPlan.cta})`
          : "Create an account in minutes. No credit card required."
      }
    >
      <SignupForm
        initialEmail={email ?? ""}
        selectedPlanName={selectedPlan?.name}
        planId={selectedPlan?.id}
      />
    </AuthShell>
  );
}
