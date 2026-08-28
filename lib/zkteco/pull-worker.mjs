import { createRequire } from "node:module";
import { join } from "node:path";

const ZKLib = createRequire(join(process.cwd(), "package.json"))("node-zklib");

const CMD_SET_TIME = 202;
const PULL_MS = 50_000;
const CONNECT_MS = 12_000;

function encodeZkTime(date) {
  return (
    ((date.getFullYear() % 100) * 12 * 31 + (date.getMonth() + 1) * 31 + date.getDate() - 1) *
      (24 * 60 * 60) +
    (date.getHours() * 60 + date.getMinutes()) * 60 +
    date.getSeconds()
  );
}

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function pinFromRecord(record) {
  const raw = record.deviceUserId ?? record.userSn;
  return String(raw ?? "").replace(/\0/g, "").trim();
}

function dateFromRecord(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

const ip = String(process.argv[2] || "").trim();
const port = Number(process.argv[3]) || 4370;
if (!ip) {
  console.error("ip required");
  process.exit(1);
}

const zk = new ZKLib(ip, port, CONNECT_MS, 4000);

try {
  await withTimeout(zk.createSocket(), CONNECT_MS, "connect timeout");
  try {
    const payload = Buffer.alloc(4);
    payload.writeUInt32LE(encodeZkTime(new Date()), 0);
    await withTimeout(zk.executeCmd(CMD_SET_TIME, payload), 5_000, "set time timeout");
  } catch {
    // Older boards ignore SET TIME over 4370.
  }
  const result = await withTimeout(zk.getAttendances(), PULL_MS, "attendance timeout");
  const records = Array.isArray(result) ? result : result?.data ?? [];
  const punches = [];
  for (const record of records) {
    const pin = pinFromRecord(record);
    const punchedAt = dateFromRecord(record.recordTime);
    if (!pin || !punchedAt) continue;
    punches.push({
      pin,
      punchedAt: punchedAt.toISOString(),
      statusCode: 0,
      verifyType: 1,
      rawLine: `pull:${ip}:${pin}:${punchedAt.toISOString()}`,
    });
  }
  process.stdout.write(JSON.stringify({ ok: true, punches }));
} catch (err) {
  process.stderr.write(err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  try {
    await zk.disconnect();
  } catch {
    // ignore
  }
}
