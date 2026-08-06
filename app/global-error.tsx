"use client";

import { useEffect } from "react";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ErrorFallback } from "@/components/ui/error-fallback";
import { notify } from "@/lib/toast";
import { toUserMessage } from "@/lib/user-messages";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    notify.error(toUserMessage(error));
  }, [error]);

  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-full font-sans antialiased bg-gray-50`}>
        <ErrorFallback
          reset={reset}
          homeHref="/"
          description="Please try again. If the problem continues, refresh the page."
        />
        <ToastProvider />
      </body>
    </html>
  );
}
