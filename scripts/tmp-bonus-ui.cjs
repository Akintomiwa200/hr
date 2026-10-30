const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const token = fs
  .readFileSync(path.join(process.env.TEMP, "smart-hr-token.txt"), "utf8")
  .trim();
const outDir = path.join(process.env.TEMP, "bonus-shots");
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  ["overview", "/bonuses"],
  ["awards", "/bonuses/awards"],
  ["award-detail", "/bonuses/awards/cmvuult4y000a0o7lcc4m702t"],
  ["payouts", "/bonuses/payouts"],
  ["plans", "/bonuses/plans"],
  ["settings", "/bonuses/settings"],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const results = [];
  for (const [viewportName, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setCookie({
      name: "smart-hr-session",
      value: token,
      domain: "localhost",
      path: "/",
    });
    for (const [name, url] of pages) {
      const errors = [];
      const onConsole = (msg) => {
        if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
      };
      const onPageError = (err) => errors.push(`pageerror: ${err.message}`);
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      let status = "ok";
      try {
        const res = await page.goto(`http://localhost:3000${url}`, {
          waitUntil: "networkidle2",
          timeout: 90000,
        });
        status = String(res ? res.status() : "no-response");
        await new Promise((r) => setTimeout(r, 500));
      } catch (error) {
        errors.push(`nav: ${error.message}`);
        status = "nav-failed";
      }
      const layout = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const overflow = Math.max(doc.scrollWidth, body.scrollWidth) - doc.clientWidth;
        const wide = Array.from(document.querySelectorAll("body *"))
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.right > window.innerWidth + 1;
          })
          .slice(0, 8)
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 80),
            right: Math.round(el.getBoundingClientRect().right),
          }));
        return {
          overflow,
          wide,
          text: (body.innerText || "").replace(/\s+/g, " ").slice(0, 160),
        };
      });
      await page.screenshot({
        path: path.join(outDir, `${viewportName}-${name}.png`),
        fullPage: true,
      });
      results.push({ viewportName, name, status, errors, ...layout });
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
