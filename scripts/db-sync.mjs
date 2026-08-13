import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = resolve(root, "prisma/migrations");
const require = createRequire(resolve(root, "package.json"));
const prismaCli = require.resolve("prisma/build/index.js");

/** Load .env into process.env without overriding existing vars. */
function loadEnvFile(fileName) {
  const filePath = resolve(root, fileName);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function runPrisma(label, args) {
  console.log(`[db-sync] ${label}…`);
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      // Quiet Prisma CLI tips / upgrade banner during predev.
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
    },
    shell: false,
  });
  if (result.error) {
    console.error(`[db-sync] ${label} failed.`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[db-sync] ${label} failed.`);
    process.exit(result.status ?? 1);
  }
}

function hasMigrations() {
  if (!existsSync(migrationsDir)) return false;
  return existsSync(resolve(migrationsDir, "migration_lock.toml"));
}

runPrisma("Generating Prisma client", ["generate"]);

if (!process.env.DATABASE_URL) {
  console.warn("[db-sync] DATABASE_URL is not set — skipping migrate deploy.");
  process.exit(0);
}

if (!hasMigrations()) {
  console.warn("[db-sync] No migrations found — skipping migrate deploy.");
  process.exit(0);
}

if (!process.env.DIRECT_URL && process.env.DATABASE_URL.includes("neon.tech")) {
  console.warn(
    "[db-sync] DIRECT_URL is not set. Neon schema sync works best with a direct (non-pooler) URL."
  );
}

runPrisma("Applying migrations", ["migrate", "deploy"]);
console.log("[db-sync] Database is in sync.");
