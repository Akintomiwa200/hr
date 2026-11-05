import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { PeerFeedbackHub } from "@/components/performance/peer-feedback-hub";

export default async function PeerFeedbackPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  return <div className="space-y-5"><PageHeader title="360° Feedback" description="HR assigns peer feedback for active review cycles. Reviewers see only their own assigned feedback; HR can review submitted responses." /><PeerFeedbackHub /></div>;
}
