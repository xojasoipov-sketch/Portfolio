/**
 * Regenerates public/Saidburxon-Xojasoipov-CV.pdf from the live /cv route.
 *
 * The PDF is committed rather than built in CI because Playwright is not a
 * project dependency and the GitHub Pages workflow has no browser step. CV
 * data changes rarely, so a committed artifact plus this one command is a
 * better trade than making every deploy depend on a browser download.
 *
 *   npm run build && PORT=3179 node .output/server/index.mjs &
 *   node scripts/generate-cv-pdf.mjs
 *
 * Note: the /cv page's own "PDF yuklab olish" button calls window.print(),
 * which always reflects current data — this file only exists so the Telegram
 * bot has a real document to send.
 */
import { chromium } from "playwright-core";

const URL = process.env.CV_URL ?? "http://127.0.0.1:3179/cv";
const OUT = "public/Saidburxon-Xojasoipov-CV.pdf";
const CHROME =
  process.env.CHROME_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", bottom: "14mm", left: "13mm", right: "13mm" },
});
await browser.close();
console.log(`wrote ${OUT}`);
