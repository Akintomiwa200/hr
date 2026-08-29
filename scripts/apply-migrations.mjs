import pg from "pg";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(fileName) {
  const p = resolve(root, fileName);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error("DIRECT_URL not set in .env");
  process.exit(1);
}

(async () => {
  const client = new pg.Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // Ensure _prisma_migrations table exists (mirrors what Prisma uses)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `);

    const appliedRes = await client.query('SELECT "migration_name" FROM "_prisma_migrations"');
    const applied = new Set(appliedRes.rows.map((r) => r.migration_name));

    const migrationsDir = resolve(root, "prisma/migrations");
    const folders = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    const skipped = [];
    const appliedNow = [];
    for (const folder of folders) {
      const sqlFile = resolve(migrationsDir, folder, "migration.sql");
      if (!existsSync(sqlFile)) {
        skipped.push(`${folder} (no migration.sql)`);
        continue;
      }
      if (applied.has(folder)) {
        skipped.push(`${folder} (already applied)`);
        continue;
      }
      const sql = readFileSync(sqlFile, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const id = createHash("md5").update(folder).digest("hex").slice(0, 32);

      console.log(`Applying ${folder} ...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","started_at","applied_steps_count")
           VALUES ($1,$2,now(),$3,now(),1) ON CONFLICT ("id") DO NOTHING`,
          [id, checksum, folder],
        );
        await client.query("COMMIT");
        appliedNow.push(folder);
      } catch (e) {
        await client.query("ROLLBACK");
        console.error(`  FAILED ${folder}: ${e.message}`);
        throw e;
      }
    }

    const count = await client.query('SELECT count(*)::int AS n FROM "_prisma_migrations"');
    console.log(`Applied now: ${appliedNow.length}`);
    console.log(`Skipped: ${skipped.length}`);
    console.log(`Total recorded in _prisma_migrations: ${count.rows[0].n}`);
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
