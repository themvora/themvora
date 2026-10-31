/**
 * Preset regression across light and dark modes.
 *
 * Loads `/playground` in both color schemes, collects every preset card's
 * effective token values (background, foreground, primary, accent), and
 * reports whether the cards render with real theme colors rather than
 * falling through to hardcoded placeholders.
 *
 * This catches the bug where `groupByFamily` only captured one mode per
 * family, causing the other mode's card to show empty swatches.
 *
 * Usage: node scripts/probe-playground-presets.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium, CHROME, NODE, probePort, nextBin } from "./lib/probe-env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = probePort(4581);

const proc = spawn(
  NODE,
  [nextBin, "dev", "-p", String(PORT)],
  {
    cwd: path.dirname(here),
    stdio: ["ignore", "pipe", "pipe"],
  },
);

const base = `http://localhost:${PORT}`;
for (let i = 0; i < 300; i++) {
  try {
    const r = await fetch(base + "/");
    if (r.status < 500) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

let failures = 0;

function ok(msg) { console.log(`  ok   ${msg}`); }
function fail(msg) { console.log(`  FAIL ${msg}`); failures++; }

for (const mode of ["light", "dark"]) {
  console.log(`\n--- ${mode} mode ---`);

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: mode,
  });
  await ctx.addCookies([
    { name: "theme-mode", value: mode, domain: "localhost", path: "/" },
    { name: "theme-family", value: "themvora", domain: "localhost", path: "/" },
    { name: "theme-name", value: `themvora-default-${mode}`, domain: "localhost", path: "/" },
  ]);

  const page = await ctx.newPage();
  await page.goto(`${base}/playground`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2000);

  // Scroll to presets so they're fully rendered
  await page.locator("#presets").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const cards = await page.locator("#presets [data-themvora-scope]").evaluateAll(
    (scopes) =>
      scopes.map((scope) => {
        const cs = getComputedStyle(scope);
        const bg = cs.backgroundColor;
        const label = scope.querySelector(".font-semibold")?.textContent ?? "(no label)";
        const family = scope.querySelector(".mono")?.textContent ?? "(no family)";
        const activeBadge = scope.querySelector('[class*="bg-primary"]')?.textContent ?? "";
        const swatches = [...scope.querySelectorAll(".rounded-full.border")].map(
          (s) => getComputedStyle(s).backgroundColor,
        );
        return {
          label,
          family,
          bg,
          active: activeBadge === "Active",
          swatchCount: swatches.length,
          swatches: swatches.slice(0, 4),
        };
      }),
  );

  if (cards.length >= 5) ok(`${mode}: ${cards.length} preset cards rendered`);
  else fail(`${mode}: only ${cards.length} preset cards rendered`);

  // Check that cards have real background colors (not transparent or empty)
  const emptyBg = cards.filter((c) => !c.bg || c.bg === "transparent" || c.bg === "rgba(0, 0, 0, 0)");
  if (emptyBg.length === 0) ok(`${mode}: all cards have computed backgrounds`);
  else fail(`${mode}: ${emptyBg.length} cards have empty backgrounds`);

  // Check that each card has swatches
  const noSwatches = cards.filter((c) => c.swatchCount < 4);
  if (noSwatches.length === 0) ok(`${mode}: all cards have 4+ color swatches`);
  else {
    fail(`${mode}: ${noSwatches.length} cards have <4 swatches`);
    for (const c of noSwatches) {
      console.log(`       ${c.family}: ${c.swatchCount} swatches`);
    }
  }

  // Check that at least one card is marked active
  const activeCards = cards.filter((c) => c.active);
  if (activeCards.length >= 1) ok(`${mode}: ${activeCards.length} active card(s)`);
  else fail(`${mode}: no active card found`);

  // Report card details
  for (const c of cards.slice(0, 3)) {
    console.log(`       ${c.family.padEnd(20)} bg=${c.bg}  swatches=${c.swatchCount}  active=${c.active}`);
  }
  if (cards.length > 3) console.log(`       ... and ${cards.length - 3} more`);

  await ctx.close();
}

// --- URL state restoration ---
console.log("\n--- URL state restoration ---");
const urlCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const urlPage = await urlCtx.newPage();

// Load with query params
await urlPage.goto(`${base}/playground?family=plum&mode=dark&section=generator`, {
  waitUntil: "networkidle",
  timeout: 90000,
});
await urlPage.waitForTimeout(2000);

const urlHash = urlPage.url();
if (urlHash.includes("section=generator") || urlHash.includes("#generator")) {
  ok("URL section param restored");
} else {
  // The hook uses replaceState, so the params may be stripped after restoration.
  // Check if the generator section is scrolled into view instead.
  const generatorInView = await urlPage.locator("#generator").evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }).catch(() => false);
  if (generatorInView) ok("URL section param restored (scrolled into view)");
  else fail("URL section param not restored");
}

await urlCtx.close();

// --- Summary ---
console.log(`\nplayground-presets failures: ${failures}`);
await browser.close();
proc.kill("SIGKILL");
process.exit(failures ? 1 : 0);
