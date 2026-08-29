/** Server bootstrap: schedule a periodic purge of expired offboarded staff. */
import { runGlobalOffboardedCleanup } from "@/lib/offboarding/cleanup";

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  runGlobalOffboardedCleanup().catch(() => {
    // best-effort startup purge; ignore transient DB errors
  });

  const timer = setInterval(() => {
    runGlobalOffboardedCleanup().catch(() => {
      // best-effort periodic purge; ignore transient DB errors
    });
  }, PURGE_INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}