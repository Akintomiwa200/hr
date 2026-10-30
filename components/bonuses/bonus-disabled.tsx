import Link from "next/link";
import { BadgeDollarSign, Lock, Settings2 } from "lucide-react";

export function BonusDisabled({
  canManage,
}: {
  canManage: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white">
        <div className="px-6 py-8 text-center sm:px-12 sm:py-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm">
            <BadgeDollarSign className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-gray-900">Bonuses are not activated</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-gray-600">
            The Bonuses module is switched off for your company. Activate it to create plans,
            award bonuses, run approval workflows and track payouts.
          </p>
          {canManage ? (
            <Link
              href="/bonuses/settings"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
            >
              <Settings2 className="h-4 w-4" />
              Open bonus settings
            </Link>
          ) : (
            <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600">
              <Lock className="h-4 w-4" />
              Ask your HR admin to activate bonuses
            </p>
          )}
          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            {[
              { title: "Flexible plans", body: "Fixed, percentage or tiered plans with caps." },
              { title: "Approval flow", body: "Route awards to the right approver role." },
              { title: "Payroll ready", body: "Track approvals through to payout." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white bg-white/70 p-3">
                <p className="text-[12px] font-semibold text-gray-800">{item.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-500">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
