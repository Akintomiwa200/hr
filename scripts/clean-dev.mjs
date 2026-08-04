import { rmSync, readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const root = process.cwd();
const lockPath = join(root, ".next", "dev", "lock");
const nextDir = join(root, ".next");

function killPid(pid) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    console.log(`Stopped process ${pid}`);
  } catch {
    // Process may already be gone
  }
}

if (existsSync(lockPath)) {
  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    if (lock.pid) killPid(lock.pid);
  } catch {
    // Ignore malformed lock file
  }

  try {
    rmSync(lockPath, { force: true });
    console.log("Removed stale dev lock");
  } catch {
    // Ignore
  }
} else {
  console.log("No dev lock found");
}

if (existsSync(nextDir)) {
  try {
    rmSync(nextDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    console.log("Removed .next cache");
  } catch (error) {
    console.warn("Could not remove .next — stop the dev server and run again.");
    console.warn(error instanceof Error ? error.message : error);
  }
}
