"use client";

import Link from "next/link";
import type { Role } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui";
import { getAppFeaturesBySection } from "@/lib/app-features";

export function ModulesDirectory({ role }: { role: Role }) {
  const sections = getAppFeaturesBySection(role);
  const sectionNames = Object.keys(sections);

  if (sectionNames.length === 0) return null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">All modules</h2>
        <p className="text-sm text-gray-500 mt-1">
          Every feature available to your role — jump straight to any page.
        </p>
      </div>

      {sectionNames.map((section) => (
        <div key={section}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            {section}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {sections[section].map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.id}
                  href={feature.href}
                  className="group flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-violet-200 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                      {feature.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{feature.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 shrink-0 mt-1" />
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <Card className="p-5 bg-gray-50 border-gray-100">
        <p className="text-sm text-gray-600">
          Public API docs for developers and device integrations are at{" "}
          <Link href="/api" className="font-medium text-violet-600 hover:text-violet-700">
            /api
          </Link>
          . In-app guides cover each module in detail above.
        </p>
      </Card>
    </section>
  );
}
