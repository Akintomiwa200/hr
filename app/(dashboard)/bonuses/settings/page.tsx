import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canManageBonuses } from "@/lib/bonuses/access";
import { getBonusSettings } from "@/lib/bonuses/settings";
import { listBonusTypeViews } from "@/lib/bonuses/queries";
import { prisma } from "@/lib/prisma";
import { BonusSettingsModule } from "@/components/bonuses/bonus-settings-module";

export default async function BonusSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageBonuses(session.role)) redirect("/bonuses");

  const [settings, types, departments, branches] = await Promise.all([
    getBonusSettings(session.companyId),
    listBonusTypeViews(session),
    session.companyId
      ? prisma.department.findMany({
          where: { companyId: session.companyId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    session.companyId
      ? prisma.branch.findMany({
          where: { companyId: session.companyId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/bonuses"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-violet-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to bonuses
      </Link>
      <BonusSettingsModule
        initialSettings={settings}
        types={types}
        departments={departments}
        branches={branches}
      />
    </div>
  );
}
