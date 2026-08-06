"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Mail,
  MessageSquare,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui";
import { ModulesDirectory } from "@/components/help/modules-directory";
import {
  getHelpArticlesForRole,
  globalHelpFaqs,
  helpCategories,
  searchHelpArticles,
  type HelpArticle,
} from "@/lib/help-content";

const inputClass =
  "w-full pl-11 pr-4 py-3.5 text-sm bg-white border border-gray-200 rounded-2xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 shadow-[0_1px_3px_rgba(0,0,0,0.04)]";

function ArticleCard({ article }: { article: HelpArticle }) {
  const Icon = article.icon;

  return (
    <Link
      href={`/help/${article.slug}`}
      className="group block p-5 bg-white border border-gray-100 rounded-2xl hover:border-violet-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
            {article.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export function HelpHub({ role }: { role: Role }) {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const articles = useMemo(() => getHelpArticlesForRole(role), [role]);
  const results = useMemo(
    () => (query.trim() ? searchHelpArticles(query, role) : []),
    [query, role]
  );

  const popular = articles.slice(0, 4);

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-600 to-[#6346FE] text-white shadow-lg shadow-violet-200/40">
        <div className="p-8">
          <div className="flex items-center gap-2 text-violet-100 text-sm font-medium mb-2">
            <BookOpen className="w-4 h-4" />
            Help Center
          </div>
          <h2 className="text-2xl font-bold mb-2">How can we help you?</h2>
          <p className="text-violet-100 text-sm mb-6 max-w-xl">
            Browse guides for every module, search for answers, or contact support.
          </p>
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides, e.g. leave, payroll, calendar..."
              className={inputClass}
            />
          </div>
        </div>
      </Card>

      {query.trim() ? (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </h3>
          {results.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-gray-500 mb-4">No guides matched your search.</p>
              <Link href="/help/contact" className="text-sm font-medium text-violet-600 hover:text-violet-700">
                Contact support instead
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Browse by category</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {helpCategories.map((category) => {
                const Icon = category.icon;
                const count = articles.filter((a) => a.category === category.id).length;
                if (count === 0) return null;

                return (
                  <Link
                    key={category.id}
                    href={`/help/category/${category.id}`}
                    className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-violet-200 hover:shadow-sm transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-violet-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{category.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                    <p className="text-[11px] text-violet-600 font-medium mt-2">{count} guides</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Popular guides</h3>
              <Link href="/help/guides" className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {popular.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Frequently asked questions</h3>
              <div className="space-y-2">
                {globalHelpFaqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div key={faq.question} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                      >
                        {faq.question}
                        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 bg-violet-50/50 border-violet-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Still need help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Reach our support team or review your account settings.
              </p>
              <div className="space-y-2">
                <Link
                  href="/help/contact"
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Contact support
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Account settings
                </Link>
              </div>
            </Card>
          </section>

          <ModulesDirectory role={role} />
        </>
      )}
    </div>
  );
}
