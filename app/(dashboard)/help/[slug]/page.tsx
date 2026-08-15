import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageOrgContent } from "@/lib/roles";
import { HelpArticleView } from "@/components/help/help-article-view";
import { getHelpArticle } from "@/lib/help-content";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) return { title: "Help — Smart HR" };
  return {
    title: `${article.title} — Help Center`,
    description: article.description,
  };
}

export default async function HelpArticlePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageOrgContent(session.role)) redirect("/dashboard");

  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();

  return <HelpArticleView slug={slug} role={session.role} />;
}
