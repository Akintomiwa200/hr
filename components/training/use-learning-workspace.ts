"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";
import { readApiError } from "@/lib/toast";
import type { LearningWorkspace } from "@/lib/learning/types";

/**
 * Shared live workspace loader for every learning screen. All mutations publish
 * `training_updated`, so the same hook keeps catalog, assignments, paths and
 * analytics in sync without polling.
 */
export function useLearningWorkspace() {
  const [data, setData] = useState<LearningWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/training", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Learning data could not be loaded.")
        );
      }
      const result = (await response.json()) as LearningWorkspace;
      setData(result);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Learning data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load(true));
  }, [load]);

  useAppEvents({
    types: ["training_updated"],
    onEvent: () => {
      void load(false);
    },
  });

  useRealtimeStatus((connected) => {
    if (connected) void load(false);
  });

  return { data, loading, error, reload: load, setData };
}
