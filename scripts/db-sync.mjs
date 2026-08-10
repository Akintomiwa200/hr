import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = resolve(root, "prisma/migrations");

function run(label, command, args) {
  console.log(`[db-sync] ${label}…`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`[db-sync] ${label} failed.`);
    process.exit(result.status ?? 1);
  }
}

function hasMigrations() {
  if (!existsSync(migrationsDir)) return false;
  return existsSync(resolve(migrationsDir, "migration_lock.toml"));
}

run("Generating Prisma client", "npx", ["prisma", "generate"]);

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

run("Applying migrations", "npx", ["prisma", "migrate", "deploy"]);
console.log("[db-sync] Database is in sync.");
