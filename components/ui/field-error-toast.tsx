"use client";

import { useEffect, useRef } from "react";
import { notify } from "@/lib/toast";

export function FieldErrorToast({ error }: { error?: string }) {
  const lastShown = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!error || error === lastShown.current) return;
    lastShown.current = error;
    notify.error(error);
  }, [error]);

  return null;
}
