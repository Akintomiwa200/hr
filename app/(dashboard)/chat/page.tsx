import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export const metadata = {
  title: "Chat | Smart HR",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const { c } = await searchParams;
  const name =
    [session.firstName, session.lastName].filter(Boolean).join(" ").trim() ||
    session.email;

  return (
    <ChatWorkspace
      currentUserId={session.id}
      currentUserName={name}
      currentUserAvatar={session.avatar ?? null}
      variant="page"
      initialConversationId={c ?? null}
    />
  );
}
