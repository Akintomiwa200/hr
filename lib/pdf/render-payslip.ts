import puppeteer, {
  type Browser,
  type Page,
} from "puppeteer-core";

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter((p): p is string => Boolean(p));

let browser: Browser | null = null;

async function getBrowser() {
  if (browser) return browser;
  const launch = async () => {
    let lastError: Error | null = null;
    for (const execPath of CHROME_PATHS) {
      try {
        return await puppeteer.launch({
          executablePath: execPath,
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    throw lastError ?? new Error("No Chrome/Chromium executable found");
  };
  browser = await launch();
  browser.on("disconnected", () => {
    browser = null;
  });
  return browser;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const instance = await getBrowser();
  const page: Page = await instance.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "12mm", bottom: "10mm", left: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}