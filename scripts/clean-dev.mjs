import { rmSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, ".next");
if (target !== root && target.startsWith(`${root}${sep}`) && target.endsWith(`${sep}.next`)) {
  rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
  console.log("Cleared the generated Next.js cache.");
}
