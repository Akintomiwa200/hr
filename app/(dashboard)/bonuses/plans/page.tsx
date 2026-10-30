import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { canManageBonuses, canViewBonuses } from "@/lib/bonuses/access";
import { getBonusSettings, isBonusModuleEnabled } from "@/lib/bonuses/settings";
import { listBonusTypeViews } from "@/lib/bonuses/queries";
import { BonusDisabled } from "@/components/bonuses/bonus-disabled";
import { BonusPlansModule } from "@/components/bonuses/bonus-plans-module";

export default async function BonusPlansPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewBonuses(session.role)) redirect("/dashboard");
  if (!canManageBonuses(session.role)) redirect("/bonuses/awards");

  const enabled = await isBonusModuleEnabled(session.companyId);
  if (!enabled) return <BonusDisabled canManage />;

  const [types, settings] = await Promise.all([
    listBonusTypeViews(session),
    getBonusSettings(session.companyId),
  ]);

  return (
    <div>
      <PageHeader
        title="Bonus plans"
        description="Define how bonuses are calculated, capped and approved."
      />
      <BonusPlansModule initialTypes={types} currency={settings.currency} />
    </div>
  );
}
