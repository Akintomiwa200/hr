import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

export function HelpLink({
  slug,
  className,
  label = "Help",
}: {
  slug?: string;
  className?: string;
  label?: string;
}) {
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
