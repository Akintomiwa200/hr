import Link from "next/link";
import type { Role } from "@prisma/client";
import { ArrowLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui";
import {
  getHelpArticle,
  getRelatedArticles,
  type HelpArticle,
} from "@/lib/help-content";

function Breadcrumb({ title }: { title: string }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
      <Link href="/help" className="hover:text-violet-600 transition-colors">
        Help
      </Link>
      <ChevronRight className="w-4 h-4" />
      <span className="text-gray-900 font-medium truncate">{title}</span>
    </nav>
  );
}

export function HelpArticleView({ slug, role }: { slug: string; role: Role }) {
  const article = getHelpArticle(slug);
  if (!article || !article.roles.includes(role)) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-gray-600 mb-4">This guide is not available for your account.</p>
        <Link href="/help" className="text-sm font-medium text-violet-600 hover:text-violet-700">
          Back to Help Center
        </Link>
      </Card>
    );
  }

  const related = getRelatedArticles(slug, role);
  const Icon = article.icon;

  return (
    <div>
      <Breadcrumb title={article.title} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 sm:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{article.title}</h1>
                <p className="text-sm text-gray-500 mt-1">{article.description}</p>
              </div>
            </div>

            {article.steps && article.steps.length > 0 && (
              <div className="mb-8 p-5 bg-violet-50/60 rounded-2xl border border-violet-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick steps</h2>
                <ol className="space-y-4">
                  {article.steps.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{step.title}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="space-y-8">
              {article.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-base font-semibold text-gray-900 mb-2">{section.heading}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{section.body}</p>
                  {section.bullets && (
                    <ul className="mt-3 space-y-2">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 text-sm text-gray-600">
                          <span className="text-violet-500 mt-1.5">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {article.faqs && article.faqs.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Common questions</h2>
                <div className="space-y-4">
                  {article.faqs.map((faq) => (
                    <div key={faq.question}>
                      <p className="text-sm font-medium text-gray-900">{faq.question}</p>
                      <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Help Center
          </Link>
        </div>

        <aside className="space-y-4">
          {article.moduleHref && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Open module</h3>
              <p className="text-xs text-gray-500 mb-4">Jump directly to this feature in Smart HR.</p>
              <Link
                href={article.moduleHref}
                className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700"
              >
                Go to module
                <ExternalLink className="w-4 h-4" />
              </Link>
            </Card>
          )}

          {related.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Related guides</h3>
              <div className="space-y-2">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/help/${item.slug}`}
                    className="block text-sm text-gray-600 hover:text-violet-600 transition-colors"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5 bg-violet-50/50 border-violet-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Need help?</h3>
            <p className="text-xs text-gray-500 mb-3">
              Browse module guides or contact support from the Help Center.
            </p>
            <Link href="/help" className="text-sm font-medium text-violet-600 hover:text-violet-700">
              Open Help Center
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function HelpArticleList({
  title,
  description,
  articles,
}: {
  title: string;
  description: string;
  articles: HelpArticle[];
}) {
  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/help" className="hover:text-violet-600 transition-colors">
          Help
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{title}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {articles.map((article) => {
          const Icon = article.icon;
          return (
            <Link
              key={article.slug}
              href={`/help/${article.slug}`}
              className="group p-5 bg-white border border-gray-100 rounded-2xl hover:border-violet-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
                    {article.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{article.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
