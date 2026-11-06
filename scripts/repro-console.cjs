const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";

function discoverRoutes(dir, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      let segment = entry.name;
      if (segment.startsWith("(") && segment.endsWith(")")) segment = "";
      const nextPrefix = segment ? `${prefix}/${segment}` : prefix;
      out.push(...discoverRoutes(full, nextPrefix));
    } else if (entry.name === "page.tsx") {
      if (prefix.includes("[")) continue;
      out.push(prefix || "/");
    }
  }
  return out;
}

const ROUTES = [...new Set(discoverRoutes(path.join(process.cwd(), "app")))].sort();

(async () => {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "smart-hr-dev-secret"
  );
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true, archivedAt: null },
    include: { employee: true },
  });
  if (!user) {
    console.log("NO_SUPER_ADMIN");
    process.exit(1);
  }
  console.log("SESSION_USER=" + user.email + " ROUTES=" + ROUTES.length);

  const token = await new SignJWT({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? null,
      employeeId: user.employee?.id,
      firstName: user.employee?.firstName,
      lastName: user.employee?.lastName,
    },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  await prisma.$disconnect();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await browser.setCookie({
    name: "smart-hr-session",
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });

  const problems = [];
  let current = "";
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      problems.push(`[console] ${current} :: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    problems.push(`[pageerror] ${current} :: ${err.message}`);
  });
  page.on("requestfailed", (req) => {
    if (req.url().includes("/api/events")) return;
    const failure = req.failure();
    problems.push(
      `[requestfailed] ${current} :: ${req.method()} ${req.url()} :: ${failure?.errorText}`
    );
  });

  for (const route of ROUTES) {
    current = route;
    try {
      await page.goto(BASE + route, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await new Promise((r) => setTimeout(r, 2200));
    } catch (e) {
      problems.push(`[goto] ${route} :: ${e.message}`);
    }
  }

  await browser.close();

  const unique = [...new Set(problems)];
  console.log("PROBLEM_COUNT=" + unique.length);
  for (const p of unique) console.log(p);
})().catch((e) => {
  console.log("FATAL " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
