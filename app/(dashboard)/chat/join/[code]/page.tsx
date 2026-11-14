import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { broadcastChatEvent } from "@/lib/chat-events";
import { joinGroupByInviteCode } from "@/lib/chat";

export const metadata = {
  title: "Join group | Smart HR",
};

export default async function JoinChatGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");
  if (!isChatModelReady()) redirect("/chat");

  const { code } = await params;

  let conversationId: string | null = null;
  try {
    const result = await joinGroupByInviteCode(session, code);
    broadcastChatEvent(
      "chat_updated",
      {
        conversationId: result.conversation.id,
        conversation: result.conversation,
        addedIds: [session.id],
      },
      result.recipientIds
    );
    conversationId = result.conversation.id;
  } catch {
    conversationId = null;
  }

  redirect(conversationId ? `/chat?c=${conversationId}` : "/chat");
}
