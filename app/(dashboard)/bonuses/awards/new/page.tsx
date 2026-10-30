import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { canManageBonuses, canViewBonuses } from "@/lib/bonuses/access";
import { getBonusSettings, isBonusModuleEnabled } from "@/lib/bonuses/settings";
import { getBonusEmployees, listBonusTypeViews } from "@/lib/bonuses/queries";
import { BonusDisabled } from "@/components/bonuses/bonus-disabled";
import { BonusAwardForm } from "@/components/bonuses/bonus-award-form";

export default async function NewBonusAwardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewBonuses(session.role)) redirect("/dashboard");
  if (!canManageBonuses(session.role)) redirect("/bonuses/awards");

  const enabled = await isBonusModuleEnabled(session.companyId);
  if (!enabled) return <BonusDisabled canManage />;

  const [employees, types, settings] = await Promise.all([
    getBonusEmployees(session),
    listBonusTypeViews(session),
    getBonusSettings(session.companyId),
  ]);

  return (
    <div>
      <PageHeader
        title="New bonus award"
        description="Recognise great work and route the award through approval."
      />
      <BonusAwardForm employees={employees} types={types} settings={settings} />
    </div>
  );
}
