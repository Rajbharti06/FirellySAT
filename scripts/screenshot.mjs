import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/screenshots");
const BASE = "http://localhost:3002";

const pages = [
  { name: "home",            url: "/",              wait: 2000 },
  { name: "practice-setup",  url: "/practice",      wait: 2000 },
  { name: "mock-test",       url: "/mock-test",      wait: 2000 },
  { name: "dashboard",       url: "/dashboard",      wait: 3000 },
  { name: "notes",           url: "/notes",          wait: 2000 },
  { name: "mock-history",    url: "/mock-history",   wait: 2000 },
  { name: "questionbank",    url: "/questionbank",   wait: 3000 },
  { name: "study-plan",      url: "/study-plan",     wait: 2000 },
  { name: "calm",            url: "/calm",           wait: 2000 },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });

  for (const { name, url, wait } of pages) {
    console.log(`Capturing ${name}...`);
    const page = await browser.newPage();
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2", timeout: 15000 });
      await new Promise((r) => setTimeout(r, wait));
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
      console.log(`  ✓ ${name}.png`);
    } catch (e) {
      console.error(`  ✗ ${name}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log("\nAll screenshots done.");
})();
