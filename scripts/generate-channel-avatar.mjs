#!/usr/bin/env node
// Renders the Telegram channel avatar: public/channel-avatar.png, 640x640.
//
// Telegram crops a channel photo to a circle, so the monogram sits centred with
// generous margin -- the favicon's rounded-square framing and its off-centre
// arc would both be cut. Same palette and same letterforms as the site, so the
// channel reads as part of the portfolio rather than a separate thing.
//
// Usage: node scripts/generate-channel-avatar.mjs
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SIZE = 640;

const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');
  * { margin: 0; padding: 0; }
  body { width: ${SIZE}px; height: ${SIZE}px; overflow: hidden; }
  .plate {
    width: ${SIZE}px; height: ${SIZE}px;
    background: radial-gradient(circle at 32% 26%, #14100f 0%, #050505 62%);
    display: grid; place-items: center; position: relative;
  }
  /* A single arc, echoing the favicon, kept inside the circular crop. */
  .arc {
    position: absolute; inset: 84px;
    border-radius: 50%;
    border: 2px solid #8e0710;
    opacity: 0.45;
  }
  .mark {
    font-family: Inter, Arial, Helvetica, sans-serif;
    font-weight: 900;
    font-size: 268px;
    letter-spacing: -18px;
    line-height: 1;
    /* Optical centring: the -18px tracking pulls the pair left of true centre. */
    transform: translateX(9px);
  }
  .s { color: #f5f2ef; }
  .x { color: #b20d18; }
</style></head><body>
  <div class="plate"><div class="arc"></div><div class="mark"><span class="s">S</span><span class="x">X</span></div></div>
</body></html>`;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
await page.setContent(HTML, { waitUntil: "load" });
// Give the webfont a moment; the fallback stack is close but not identical.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
const out = join(ROOT, "public/channel-avatar.png");
await page.screenshot({ path: out });
await browser.close();
console.log(`wrote ${out} (${SIZE}x${SIZE})`);
