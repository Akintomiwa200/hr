"use client";

import { readApiError } from "@/lib/toast";

/** Shared client for the action-based learning API. */
export async function learningAction<T = unknown>(
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch("/api/training", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      await readApiError(response, "The learning change could not be saved.")
    );
  }
  return (await response.json()) as T;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
