import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { BenefitsModule } from "@/components/benefits/benefits-module";

export default async function BenefitsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Benefits"
        description="Employee benefits, perks and welfare programs available in your organization."
      />
      <BenefitsModule />
    </div>
  );
}