import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageOrgContent } from "@/lib/roles";
import { HelpArticleList } from "@/components/help/help-article-view";
import {
  getHelpArticlesByCategory,
  getHelpArticlesForRole,
  helpCategories,
} from "@/lib/help-content";

type Props = { params: Promise<{ category: string }> };

export default async function HelpCategoryPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageOrgContent(session.role)) redirect("/dashboard");

  const { category } = await params;
  const meta = helpCategories.find((item) => item.id === category);
  if (!meta) notFound();

  const articles = getHelpArticlesByCategory(category, session.role);
  if (articles.length === 0) notFound();

  return (
    <HelpArticleList
      title={meta.label}
      description={meta.description}
      articles={articles}
    />
  );
}
