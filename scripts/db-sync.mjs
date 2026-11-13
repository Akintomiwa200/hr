import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "package.json"));
const prismaCli = require.resolve("prisma/build/index.js");

function loadEnvFile(name) {
  const path = resolve(root, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function run(args, { allowUnavailableDatabase = false } = {}) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    shell: false,
  });
  if (result.error || result.status !== 0) {
    if (allowUnavailableDatabase) {
      console.warn("[db-sync] Database migration could not run; continuing. Database features need a reachable database.");
      return;
    }
    console.error("[db-sync] Prisma command failed.", result.error?.message ?? "");
    process.exit(result.status ?? 1);
  }
}

run(["generate"]);
if (!process.env.DATABASE_URL) {
  console.warn("[db-sync] DATABASE_URL is not set; skipping migrations.");
  process.exit(0);
}

if (!existsSync(resolve(root, "prisma/migrations/migration_lock.toml"))) {
  console.warn("[db-sync] No migrations found; skipping migrations.");
  process.exit(0);
}

run(["migrate", "deploy"], { allowUnavailableDatabase: true });
