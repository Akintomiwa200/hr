import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { BenefitsModule } from "@/components/benefits/benefits-module";
import { getBenefitsAccess, getBenefitsLive } from "@/lib/benefits";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function BenefitsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const live = await getBenefitsLive(session);
  const access = getBenefitsAccess(session);

  return (
    <div>
      <PageHeader
        title="Benefits"
        description="Your live benefits, perks and welfare programmes — powered by the modules that run them."
      />
      <BenefitsModule live={live} access={access} />
      <PageLiveRefresh
        types={[
          "leave_updated",
          "loan_updated",
          "payroll_updated",
          "bonus_updated",
          "performance_updated",
          "appraisal_updated",
          "document_updated",
          "folder_updated",
          "job_updated",
          "settings_updated",
        ]}
      />
    </div>
  );
}
