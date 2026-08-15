import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canManageOrgContent } from "@/lib/roles";
import { cn } from "@/lib/utils";

/** Help Center links — visible to Company Admin and HR only. */
export async function HelpLink({
  slug,
  className,
  label = "Help",
}: {
  slug?: string;
  className?: string;
  label?: string;
}) {
  const session = await getSession();
  if (!session || !canManageOrgContent(session.role)) return null;

  const href = slug ? `/help/${slug}` : "/help";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors",
        className
      )}
    >
      <CircleHelp className="w-4 h-4" />
      {label}
    </Link>
  );
}
