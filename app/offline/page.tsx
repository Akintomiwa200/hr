import Link from "next/link";
import { CloudOff } from "lucide-react";
import { OfflineRetryButton } from "./retry-button";

export const dynamic = "force-static";

export const metadata = {
  title: "Offline — Smart HR",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B94F6]/10">
          <CloudOff className="h-7 w-7 text-[#8B94F6]" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-gray-900">You&apos;re offline</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          This page isn&apos;t available offline yet. Pages you have visited and
          data you have loaded are cached, and any changes you make are saved on
          this device and sync automatically once you reconnect.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <OfflineRetryButton />
          <Link href="/dashboard" className="text-sm font-medium text-[#8B94F6] hover:text-[#7a83e8]">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
