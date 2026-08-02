import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { HelpArticleList } from "@/components/help/help-article-view";
import { getHelpArticlesForRole } from "@/lib/help-content";

export default async function HelpGuidesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const articles = getHelpArticlesForRole(session.role);

  return (
    <HelpArticleList
      title="All guides"
      description="Complete documentation for every module available to your role."
      articles={articles}
    />
  );
}
