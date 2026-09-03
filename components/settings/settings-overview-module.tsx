import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type SettingsCardItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent?: string;
};

export function SettingsOverviewModule({ cards }: { cards: SettingsCardItem[] }) {
  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">No settings available for your role</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const accent = card.accent ?? "text-brand-600 bg-brand-50";
        return (
          <Link key={card.id} href={card.href} className="group block">
            <article className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-brand-300 hover:-translate-y-0.5">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h2 className="text-base font-semibold text-gray-900 group-hover:text-brand-700">
                {card.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{card.description}</p>
            </article>
          </Link>
        );
      })}
    </div>
  );
}