import { Fingerprint, Monitor, Smartphone, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

const METHOD_CONFIG = {
  WEB: { label: "Web", icon: Monitor, className: "bg-sky-50 text-sky-700" },
  DEVICE: { label: "ZKTeco", icon: Fingerprint, className: "bg-brand-50 text-brand-700" },
  MOBILE: { label: "Mobile", icon: Smartphone, className: "bg-violet-50 text-violet-700" },
  MANUAL: { label: "Manual", icon: UserCog, className: "bg-gray-100 text-gray-600" },
} as const;

export function AttendanceMethodBadge({
  method,
  deviceName,
}: {
  method?: string | null;
  deviceName?: string | null;
}) {
  if (!method) return null;

  const config = METHOD_CONFIG[method as keyof typeof METHOD_CONFIG] ?? METHOD_CONFIG.MANUAL;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
        config.className
      )}
      title={deviceName ?? config.label}
    >
      <Icon className="w-3 h-3" />
      {deviceName ? deviceName : config.label}
    </span>
  );
}
