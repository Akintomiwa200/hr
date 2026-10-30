import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { bonusSeesOnlyOwn, canApproveBonuses, canManageBonuses, canViewBonuses } from "@/lib/bonuses/access";
import { getBonusSettings, isBonusModuleEnabled } from "@/lib/bonuses/settings";
import { getBonusStats, listBonusAwardViews, listBonusTypeViews } from "@/lib/bonuses/queries";
import { BonusDisabled } from "@/components/bonuses/bonus-disabled";
import { BonusOverview } from "@/components/bonuses/bonus-overview";

export default async function BonusesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewBonuses(session.role)) redirect("/dashboard");

  const enabled = await isBonusModuleEnabled(session.companyId);
  const canManage = canManageBonuses(session.role);
  if (!enabled) return <BonusDisabled canManage={canManage} />;

  const [settings, stats, awards, types] = await Promise.all([
    getBonusSettings(session.companyId),
    getBonusStats(session),
    listBonusAwardViews(session, { limit: 6 }),
    listBonusTypeViews(session),
  ]);

  return (
    <div>
      <PageHeader
        title="Bonuses"
        description="Plans, awards, approvals and payouts in one place."
      />
      <BonusOverview
        stats={stats}
        awards={awards}
        types={types}
        currency={settings.currency}
        canManage={canManage}
        canApprove={canApproveBonuses(session.role)}
        seesOnlyOwn={bonusSeesOnlyOwn(session.role)}
        payoutSchedule={settings.payoutSchedule}
        approvalRequired={settings.approvalRequired}
        approverRole={settings.approverRole}
      />
    </div>
  );
}
