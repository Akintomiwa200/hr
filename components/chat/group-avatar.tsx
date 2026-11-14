import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { box: "h-9 w-9", icon: "h-4 w-4" },
  md: { box: "h-10 w-10", icon: "h-4 w-4" },
  lg: { box: "h-20 w-20", icon: "h-8 w-8" },
} as const;

export function GroupAvatar({
  title,
  src,
  size = "md",
  className,
}: {
  title: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const style = sizes[size];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-violet-600 ring-2 ring-violet-50",
        style.box,
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${title} group profile`} className="h-full w-full object-cover" />
      ) : (
        <Users className={style.icon} aria-hidden="true" />
      )}
    </span>
  );
}
