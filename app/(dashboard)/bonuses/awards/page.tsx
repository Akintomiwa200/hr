import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { canApproveBonuses, canManageBonuses, canViewBonuses } from "@/lib/bonuses/access";
import { getBonusSettings, isBonusModuleEnabled } from "@/lib/bonuses/settings";
import { listBonusAwardViews } from "@/lib/bonuses/queries";
import { BonusDisabled } from "@/components/bonuses/bonus-disabled";
import { BonusAwardsModule } from "@/components/bonuses/bonus-awards-module";

export default async function BonusAwardsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewBonuses(session.role)) redirect("/dashboard");

  const canManage = canManageBonuses(session.role);
  const enabled = await isBonusModuleEnabled(session.companyId);
  if (!enabled) return <BonusDisabled canManage={canManage} />;

  const [awards, settings] = await Promise.all([
    listBonusAwardViews(session),
    getBonusSettings(session.companyId),
  ]);

  return (
    <div>
      <PageHeader
        title="Bonus awards"
        description="Every bonus, its approval state and payout progress."
      />
      <BonusAwardsModule
        initialAwards={awards}
        canManage={canManage}
        canApprove={canApproveBonuses(session.role)}
        defaultCurrency={settings.currency}
      />
    </div>
  );
}
