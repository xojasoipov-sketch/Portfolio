/**
 * Draws the banner used by a project that has no product screenshot.
 *
 * These are NOT mock UI: a fake dashboard would read as a real screenshot and
 * claim a product state that does not exist. Each banner is a typographic
 * composition in the site's own language (black canvas, brand red, Inter)
 * whose only job is to say, honestly, what the project does.
 *
 * Output is 1400x788 — the same frame as the real screenshots, so the ring's
 * 16/10 crop and the zoom panel treat every card the same.
 *
 *   node scripts/generate-project-banners.mjs
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "assets",
  "projects",
);
const W = 1400;
const H = 788;

const SHELL = (body) => `<!doctype html><meta charset="utf-8">
<style>
  :root {
    --black: #050505; --offwhite: #f5f2ef; --red: #b20d18; --dim: rgba(245,242,239,.45);
    --line: rgba(245,242,239,.14);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${W}px; height: ${H}px; background: var(--black); color: var(--offwhite);
    font-family: Inter, sans-serif; overflow: hidden; position: relative;
  }
  .eyebrow {
    position: absolute; top: 46px; left: 56px; font-size: 15px; font-weight: 600;
    letter-spacing: .22em; color: var(--red);
  }
  .sx { position: absolute; top: 42px; right: 56px; font-size: 20px; font-weight: 800; letter-spacing: -.04em; }
  .word {
    position: absolute; left: 56px; font-weight: 900; letter-spacing: -.045em; line-height: .86;
  }
  .caption {
    position: absolute; left: 58px; font-size: 17px; font-weight: 500; letter-spacing: .02em;
    color: var(--dim);
  }
</style>
${body}`;

const HISOBIM = SHELL(`
<div class="eyebrow">06 — AI MOLIYA / TELEGRAM</div>
<div class="sx">SX</div>

<!-- what the product actually does: one spoken sentence becomes three rows -->
<div style="position:absolute; top:150px; left:56px; width:560px;">
  <div style="display:flex; align-items:center; gap:14px; background:rgba(245,242,239,.06);
              border:1px solid var(--line); border-radius:22px; padding:18px 22px;">
    <div style="width:34px;height:34px;border-radius:50%;background:var(--red);flex:none;
                display:flex;align-items:center;justify-content:center;">
      <div style="width:9px;height:14px;border-radius:5px;background:var(--offwhite);"></div>
    </div>
    <div style="display:flex; align-items:center; gap:3px; height:30px; flex:1;">
      ${[
        9, 16, 26, 13, 31, 22, 37, 19, 29, 12, 24, 34, 17, 27, 11, 21, 30, 15,
        25, 10, 18, 28, 14, 23, 8, 20, 32, 13, 9, 16,
      ]
        .map(
          (h) =>
            `<div style="width:3px;height:${h}px;border-radius:2px;background:rgba(245,242,239,.55);"></div>`,
        )
        .join("")}
    </div>
    <div style="font-size:14px;font-weight:600;color:var(--dim);flex:none;">0:06</div>
  </div>
  <div style="margin-top:14px;font-size:16px;line-height:1.5;color:rgba(245,242,239,.62);">
    &ldquo;taksiga 25 ming, ovqatga 48 ming ketdi,<br>mijozdan 900 ming oldim&rdquo;
  </div>
</div>

<div style="position:absolute; top:168px; left:700px; width:644px;">
  ${[
    ["Taksi", "−25 000", "chiqim"],
    ["Ovqat", "−48 000", "chiqim"],
    ["Mijozdan", "+900 000", "kirim"],
  ]
    .map(
      ([label, amount, kind], i) => `
  <div style="display:flex;align-items:center;justify-content:space-between;
              padding:20px 26px;border:1px solid var(--line);border-radius:18px;
              ${i ? "margin-top:12px;" : ""}
              background:${kind === "kirim" ? "rgba(178,13,24,.10)" : "rgba(245,242,239,.03)"};">
    <div>
      <div style="font-size:19px;font-weight:700;letter-spacing:-.01em;">${label}</div>
      <div style="font-size:12px;font-weight:600;letter-spacing:.18em;margin-top:5px;
                  color:${kind === "kirim" ? "var(--red)" : "var(--dim)"};">${kind.toUpperCase()}</div>
    </div>
    <div style="font-size:26px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;
                color:${kind === "kirim" ? "var(--red)" : "var(--offwhite)"};">${amount}</div>
  </div>`,
    )
    .join("")}
</div>

<div class="word" style="bottom:118px; font-size:132px;">HISOBIM</div>
<div class="caption" style="bottom:66px;">bitta ovozli xabar &rarr; uchta tranzaksiya</div>
`);

const SAHNA = SHELL(`
<div class="eyebrow">07 — CHROME KENGAYTMA / AI VIDEO</div>
<div class="sx">SX</div>

<!-- the product is a side panel that runs a prompt queue, so: a docked panel -->
<div style="position:absolute; top:112px; right:56px; width:470px; height:564px;
            border:1px solid var(--line); border-radius:26px; background:rgba(245,242,239,.04);
            padding:26px 24px; display:flex; flex-direction:column;">
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:13px;font-weight:700;letter-spacing:.2em;color:var(--dim);">NAVBAT</div>
    <div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--red);">3 / 12</div>
  </div>
  <div style="height:4px;border-radius:3px;background:rgba(245,242,239,.10);margin-top:14px;overflow:hidden;">
    <div style="width:25%;height:100%;background:var(--red);"></div>
  </div>
  <div style="margin-top:22px;display:flex;flex-direction:column;gap:11px;">
  ${[
    ["Ochilish kadri", "tayyor"],
    ["Ko'cha, kechqurun", "tayyor"],
    ["Yaqin plan — yuz", "tayyor"],
    ["Mashina ichidan", "ketyapti"],
    ["Devor yozuvi", "navbatda"],
    ["Yakuniy kadr", "navbatda"],
  ]
    .map(([t, state]) => {
      const live = state === "ketyapti";
      const done = state === "tayyor";
      return `
    <div style="display:flex;align-items:center;gap:13px;padding:14px 16px;border-radius:14px;
                background:${live ? "rgba(178,13,24,.13)" : "rgba(245,242,239,.03)"};
                border:1px solid ${live ? "rgba(178,13,24,.45)" : "transparent"};">
      <div style="width:8px;height:8px;border-radius:50%;flex:none;
                  background:${live ? "var(--red)" : done ? "rgba(245,242,239,.55)" : "rgba(245,242,239,.18)"};"></div>
      <div style="font-size:16px;font-weight:600;flex:1;letter-spacing:-.01em;
                  color:${done ? "rgba(245,242,239,.55)" : "var(--offwhite)"};">${t}</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:.14em;flex:none;
                  color:${live ? "var(--red)" : "rgba(245,242,239,.3)"};">${state.toUpperCase()}</div>
    </div>`;
    })
    .join("")}
  </div>
</div>

<div class="word" style="bottom:214px; font-size:122px;">SAHNA</div>
<div class="word" style="bottom:104px; font-size:122px; color:var(--red);">STUDIO</div>
<div class="caption" style="bottom:56px;">Google Flow uchun promptlar navbati</div>
`);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const tmp = mkdtempSync(join(tmpdir(), "banners-"));

for (const [name, html] of [
  ["hisobim", HISOBIM],
  ["sahna-studio", SAHNA],
]) {
  const file = join(tmp, `${name}.html`);
  writeFileSync(file, html);
  await page.goto(`file://${file}`);
  const png = join(tmp, `${name}.png`);
  await page.screenshot({ path: png });
  // Playwright writes png only; the site serves webp like every other shot.
  execFileSync("python3", [
    "-c",
    `from PIL import Image; Image.open(${JSON.stringify(png)}).convert("RGB")` +
      `.save(${JSON.stringify(join(OUT, `${name}.webp`))}, "WEBP", quality=86, method=6)`,
  ]);
  console.log(`wrote ${name}.webp`);
}

rmSync(tmp, { recursive: true, force: true });
await browser.close();
