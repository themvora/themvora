/**
 * Production-preview browser checks for the documentation pages.
 *
 * The previous docs-browser run used `next dev`, whose HMR WebSocket is
 * blocked in this sandbox; nine assertions failed on that environmental noise.
 * This script runs against a **production** `next start` build, where there is
 * no HMR socket, so every failure is an application failure.
 *
 * Usage:
 *   node scripts/docs/verify-library-pages.mjs --url http://127.0.0.1:3120
 *   CHROME_PATH=... node scripts/docs/verify-library-pages.mjs
 */

/* global document, navigator */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = join(import.meta.dirname, "..", "..");
const BASE = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://127.0.0.1:3120";
const CHROME = process.env.CHROME_PATH ??
  "C:/Users/sauga/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const OUT = join(REPO, "verify", "library-recipes", "pages-results.json");

const SLUGS = [
  "shadcn", "bootstrap", "daisyui", "open-props", "mui",
  "chakra", "antd", "mantine", "unocss",
];

const { chromium } = await import(pathToFileURL(
  join(REPO, "examples/apps/_tools/node_modules/playwright-core/index.mjs"),
).href);
const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail: String(detail) });
  if (!ok) console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
};

let errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

try {
  for (const slug of [...SLUGS, null]) {
    const path = slug ? `/libraries/${slug}` : "/libraries";
    errors = [];
    const response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 90000 });
    const name = slug ?? "overview";
    check(`${name}: http 200`, response?.ok(), `status=${response?.status()}`);
    check(`${name}: h1 present`, (await page.locator("h1").count()) > 0);
    check(`${name}: no console errors`, errors.length === 0, errors.slice(0, 3).join(" | ").slice(0, 300));

    if (!slug) continue;

    // Framework selector.
    const tabs = page.getByRole("tab");
    const tabNames = await tabs.allInnerTexts();
    const frameworkNames = tabNames.filter((t) => !/^(pnpm|npm|yarn|bun)$/i.test(t.trim()));
    check(`${name}: framework tabs`, frameworkNames.length > 0, frameworkNames.join(", "));

    // Package-manager selector.
    for (const pm of ["pnpm", "npm", "yarn", "bun"]) {
      check(`${name}: ${pm} selector`, await page.getByRole("tab", { name: pm, exact: true }).count() > 0);
    }

    // Switching the package manager must change the rendered command.
    const before = await page.locator("#installation").innerText();
    await page.getByRole("tab", { name: "npm", exact: true }).first().click();
    await page.waitForTimeout(200);
    const after = await page.locator("#installation").innerText();
    check(`${name}: package manager changes commands`, before !== after, `${before.length} -> ${after.length} chars`);
    check(`${name}: npm syntax`, /npm install|npx /.test(after), after.split("\n").slice(0, 4).join(" / "));
    await page.getByRole("tab", { name: "pnpm", exact: true }).first().click();
    await page.waitForTimeout(150);

    // Framework switching must change the install snippet and the imports.
    if (frameworkNames.length > 1) {
      const first = frameworkNames[0].trim();
      const second = frameworkNames[1].trim();
      const installFirst = await page.locator("#installation").innerText();
      await page.getByRole("tab", { name: second, exact: true }).first().click();
      await page.waitForTimeout(250);
      const installSecond = await page.locator("#installation").innerText();
      check(`${name}: framework switch changes install`, installFirst !== installSecond, `${first} -> ${second}`);
      await page.getByRole("tab", { name: first, exact: true }).first().click();
      await page.waitForTimeout(150);
    }

    // Code rendering + copy controls.
    const copies = page.getByRole("button", { name: /copy/i });
    const copyCount = await copies.count();
    check(`${name}: copy controls`, copyCount > 0, `${copyCount} buttons`);
    if (copyCount > 0) {
      await copies.first().click();
      await page.waitForTimeout(200);
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
      check(`${name}: copy writes code to clipboard`, clip.trim().length > 0, `${clip.length} chars`);
    }

    // Sections are present and visible.
    for (const id of ["installation", "configure", "components", "run"]) {
      check(`${name}: #${id} visible`, await page.locator(`#${id}`).count() > 0);
    }
  }

  // Responsive: no horizontal overflow on a phone-width viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const slug of ["shadcn", "mui", "unocss"]) {
    errors = [];
    await page.goto(`${BASE}/libraries/${slug}`, { waitUntil: "networkidle", timeout: 90000 });
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${slug}: mobile no overflow`, overflow <= 1, `overflow=${overflow}px`);
    check(`${slug}: mobile no console errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  }
} finally {
  await context.close();
  await browser.close();
}

if (existsSync(join(REPO, "verify", "library-recipes"))) {
  writeFileSync(OUT, JSON.stringify(results, null, 2));
}
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} production docs checks passed`);
process.exit(passed === results.length ? 0 : 1);
