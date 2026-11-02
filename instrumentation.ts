/**
 * Server bootstrap: schedule a periodic purge of expired offboarded staff and
 * daily birthday celebrations.
 *
 * The handlers are imported lazily so the Edge instrumentation bundle never
 * pulls in the Prisma/Postgres client.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runGlobalOffboardedCleanup } = await import("@/lib/offboarding/cleanup");
  const { runBirthdayCelebrationsForAllCompanies } = await import("@/lib/birthdays");

  const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const BIRTHDAY_INTERVAL_MS = 24 * 60 * 60 * 1000;

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

  runBirthdayCelebrationsForAllCompanies().catch(() => {
    // best-effort startup birthday run; ignore transient DB errors
  });

  const birthdayTimer = setInterval(() => {
    runBirthdayCelebrationsForAllCompanies().catch(() => {
      // best-effort periodic birthday run; ignore transient DB errors
    });
  }, BIRTHDAY_INTERVAL_MS);

  if (typeof birthdayTimer.unref === "function") {
    birthdayTimer.unref();
  }
}
