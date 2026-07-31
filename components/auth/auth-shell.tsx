import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const highlights = [
  "Employee & attendance management",
  "Leave requests & approvals",
  "Payroll & performance tracking",
  "Role-based dashboards for every team",
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden lg:flex lg:flex-col lg:w-[46%] xl:w-[44%] bg-gradient-to-br from-[#7B61FF] via-[#8B72FF] to-[#6b51ef] p-12 xl:p-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-16 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-16 right-12 w-72 h-72 rounded-full bg-[#c4b5fd]/30 blur-3xl" />
        </div>

        <Link
          href="/"
          className="relative inline-flex items-center gap-2 text-[13px] text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="relative flex-1 flex items-center">
          <div className="max-w-md text-white">
            <Link href="/" className="text-2xl font-bold tracking-tight">
              Smart HR
            </Link>
            <h1 className="mt-10 text-[2rem] xl:text-[2.35rem] font-bold leading-tight">
              Modern HR for teams that move fast
            </h1>
            <p className="mt-4 text-[15px] text-white/80 leading-relaxed">
              Manage people, payroll, attendance, and performance in one platform
              built for HR admins, managers, and employees.
            </p>

            <ul className="mt-10 space-y-4">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[14px] text-white/90">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-white/90 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        <div className="flex items-center justify-between px-6 sm:px-10 pt-8 pb-4 lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] text-gray-500 hover:text-[#7B61FF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <Link href="/" className="text-lg font-bold text-[#7B61FF]">
            Smart HR
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 pb-10 lg:pt-10">
          <div className="w-full max-w-[420px]">
            <h2 className="text-[1.75rem] font-bold text-gray-900 tracking-tight">
              {title}
            </h2>
            <p className="mt-2 text-[14px] text-gray-500">{subtitle}</p>

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-8">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
