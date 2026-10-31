/**
 * Badge screenshot helper.
 *
 * Captures the toolbar of a labelled block so the badge can be *looked at* —
 * clipped, crowded, or mis-coloured are all failures a DOM assertion cannot see.
 *
 * Usage:
 *   PROBE_BASE=http://127.0.0.1:4413 node scripts/shot-badges.mjs
 */
import path from "node:path";
import { mkdirSync } from "node:fs";
import { chromium, CHROME } from "./lib/probe-env.mjs";

const base = process.env.PROBE_BASE ?? "http://127.0.0.1:4413";
const out = path.join(process.cwd(), ".badges");
mkdirSync(out, { recursive: true });

const SHOTS = [
  { route: "/vite-plugin", file: "vite-plugin-app-tsx.png", scheme: "light" },
  { route: "/presets", file: "presets-install.png", scheme: "light" },
  { route: "/tokens/code", file: "tokens-code.png", scheme: "light" },
  { route: "/", file: "home-hero-dark.png", scheme: "dark" },
  { route: "/vite-plugin", file: "vite-plugin-dark.png", scheme: "dark" },
  { route: "/animation", file: "animation-dark.png", scheme: "dark" },
  // The one framework exception: Angular's badges must read `TS` and its blocks
  // must carry no selector, on the guide and on the two pages that show its
  // snippets behind a picker. `expectText` names the Angular source so the shot
  // is of that block rather than of whichever block happens to be first.
  { route: "/framework-guides/angular", file: "angular-guide-light.png", scheme: "light", expectText: "@angular/platform-browser" },
  { route: "/framework-guides/angular", file: "angular-guide-dark.png", scheme: "dark", expectText: "@angular/platform-browser" },
  { route: "/quick-start", file: "quick-start-angular.png", scheme: "light", pick: "Angular", expectText: "@angular/platform-browser" },
  { route: "/animation", file: "animation-angular.png", scheme: "light", pick: "Angular", expectText: "provideTheme" },
];

/**
 * Select a framework chip before the shot, and wait for its snippet.
 *
 * The chip is matched by *prefix*, because the pickers disagree about what a
 * chip says: the framework pickers label a button with the framework name alone,
 * while Quick Start's `PickCard` renders the name and the package together
 * ("Angular @themvora/angular"). An exact match found neither of Quick Start's
 * cards.
 *
 * Waiting on the *snippet* rather than on a timeout is what makes the shot
 * trustworthy: a click that lands before hydration is a no-op, and a fixed delay
 * would happily screenshot the previous framework's block.
 */
const pickFramework = async (page, label, expectText) => {
  const ready = () =>
    page.waitForFunction(
      (text) => document.body.innerText.includes(text),
      expectText,
      { timeout: 8000 },
    );
  const chip = page
    .getByRole("button", { name: new RegExp(`^\\s*${label}\\b`) })
    .first();

  for (const attempt of ["accessibility", "dom"]) {
    try {
      if (attempt === "accessibility") {
        await chip.click({ timeout: 4000 });
      } else {
        await page.evaluate((name) => {
          const rx = new RegExp(`^\\s*${name}\\b`);
          const el = [...document.querySelectorAll("button, [role=tab]")].find((node) =>
            rx.test(node.textContent.trim()),
          );
          el?.click();
        }, label);
      }
      await ready();
      return true;
    } catch {
      /* try the next strategy */
    }
  }
  return false;
};

const failures = [];

/**
 * The docs site persists an explicit choice and does not follow
 * `prefers-color-scheme`, so a dark shot has to use the real control — the
 * header's "Switch to Dark" button — rather than a `colorScheme` context option.
 * Setting the attributes by hand was tried and left the page light: the runtime
 * re-applies its own selection on hydration.
 */
const forceDark = async (page) => {
  const toggle = page.getByRole("button", { name: /Switch to Dark/i }).first();
  if ((await toggle.count()) > 0) {
    await toggle.click();
  } else {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme-mode", "dark");
      localStorage.setItem("theme-mode", "dark");
    });
  }
  await page.waitForTimeout(600);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const shot of SHOTS) {
  const context = await browser.newContext({
    colorScheme: shot.scheme,
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(base + shot.route, { waitUntil: "networkidle", timeout: 90000 });
  if (shot.pick && !(await pickFramework(page, shot.pick, shot.expectText))) {
    failures.push(`${shot.route}: could not select "${shot.pick}"`);
  }
  if (shot.scheme === "dark") await forceDark(page);

  // The block the shot is about: the one whose source the entry names, else the
  // first one whose toolbar carries a label, so the shot is of the badge rather
  // than of whatever happens to be at the top of the page.
  const matching = shot.expectText
    ? page.locator(".code-block").filter({ hasText: shot.expectText })
    : page.locator(".code-block").filter({ has: page.locator(".code-block-lang") });
  const labelled = page.locator(".code-block").filter({ has: page.locator(".code-block-lang") });
  const target =
    (await matching.count()) > 0
      ? matching.first()
      : (await labelled.count()) > 0
        ? labelled.first()
        : page.locator(".code-block").first();
  if (shot.expectText && (await matching.count()) === 0) {
    failures.push(`${shot.route}: no block contains ${JSON.stringify(shot.expectText)}`);
  }
  await target.scrollIntoViewIfNeeded();
  await target.screenshot({ path: path.join(out, shot.file) });
  console.log(`ok  ${shot.route} (${shot.scheme}) → ${shot.file}`);
  await context.close();
}

// Mobile: the toolbar must stay usable at 390 px.
{
  const context = await browser.newContext({
    colorScheme: "light",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${base}/vite-plugin`, { waitUntil: "networkidle", timeout: 90000 });
  const block = page.locator(".code-block").filter({ has: page.locator(".code-block-lang") }).first();
  const target = (await block.count()) > 0 ? block : page.locator(".code-block").first();
  await target.scrollIntoViewIfNeeded();
  await target.screenshot({ path: path.join(out, "mobile-vite-plugin.png") });
  console.log("ok  /vite-plugin (390px) → mobile-vite-plugin.png");
  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
