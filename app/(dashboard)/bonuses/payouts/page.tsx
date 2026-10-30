import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { canManageBonuses, canViewBonuses } from "@/lib/bonuses/access";
import { getBonusSettings, isBonusModuleEnabled } from "@/lib/bonuses/settings";
import { listBonusAwardViews } from "@/lib/bonuses/queries";
import { BonusDisabled } from "@/components/bonuses/bonus-disabled";
import { BonusPayoutsModule } from "@/components/bonuses/bonus-payouts-module";

export default async function BonusPayoutsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewBonuses(session.role)) redirect("/dashboard");

  const canManage = canManageBonuses(session.role);
  const enabled = await isBonusModuleEnabled(session.companyId);
  if (!enabled) return <BonusDisabled canManage={canManage} />;

  const [awards, settings] = await Promise.all([
    listBonusAwardViews(session, { limit: 500 }),
    getBonusSettings(session.companyId),
  ]);

  return (
    <div>
      <PageHeader
        title="Bonus payouts"
        description="Approved awards awaiting payout and settled bonus history."
      />
      <BonusPayoutsModule
        initialAwards={awards}
        currency={settings.currency}
        canManage={canManage}
      />
    </div>
  );
}
