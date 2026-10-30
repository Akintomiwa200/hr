import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canApproveBonuses, canManageBonuses, canViewBonuses } from "@/lib/bonuses/access";
import { isBonusModuleEnabled } from "@/lib/bonuses/settings";
import { getBonusAwardView } from "@/lib/bonuses/queries";
import { BonusDisabled } from "@/components/bonuses/bonus-disabled";
import { BonusAwardDetail } from "@/components/bonuses/bonus-award-detail";
import { normalizeRole } from "@/lib/roles";

export default async function BonusAwardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewBonuses(session.role)) redirect("/dashboard");

  const canManage = canManageBonuses(session.role);
  const enabled = await isBonusModuleEnabled(session.companyId);
  if (!enabled) return <BonusDisabled canManage={canManage} />;

  const { id } = await params;
  const award = await getBonusAwardView(session, id);
  if (!award) notFound();

  return (
    <BonusAwardDetail
      initialAward={award}
      canManage={canManage}
      canApprove={canApproveBonuses(session.role)}
      currentRole={normalizeRole(session.role)}
    />
  );
}
