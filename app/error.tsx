"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ui/error-fallback";
import { notify } from "@/lib/toast";
import { toUserMessage } from "@/lib/user-messages";

export default function Error({
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
    <ErrorFallback
      reset={reset}
      homeHref="/"
      description="Please try again. If the problem continues, refresh the page."
    />
  );
}
