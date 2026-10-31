/**
 * Smoke tests for the playground page.
 *
 * Loads `/playground` at a standard desktop viewport and verifies that the
 * workspace bar, section nav, and all 12 sections mount without errors. Then
 * exercises the key interactions: clicking a preset card, toggling the section
 * nav, and confirming the URL updates to reflect the active section.
 *
 * Usage: node scripts/probe-playground-smoke.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium, CHROME, NODE, probePort, nextBin } from "./lib/probe-env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = probePort(4580);

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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let failures = 0;

function ok(msg) { console.log(`  ok   ${msg}`); }
function fail(msg) { console.log(`  FAIL ${msg}`); failures++; }

await page.goto(`${base}/playground`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(2000);

// --- 1. Page title ---
const title = await page.locator("h1").first().innerText().catch(() => "");
if (title.includes("Playground")) ok("page title rendered");
else fail(`page title missing or wrong: "${title}"`);

// --- 2. Workspace bar ---
const toolbar = page.locator('[role="toolbar"][aria-label="Workspace controls"]');
const toolbarCount = await toolbar.count();
if (toolbarCount === 1) ok("workspace bar mounted");
else fail(`workspace bar: expected 1, found ${toolbarCount}`);

// --- 3. Family selector has options ---
const familySelect = page.locator('select[aria-label="Theme family"]');
const optionCount = await familySelect.locator("option").count();
if (optionCount >= 3) ok(`family selector has ${optionCount} options`);
else fail(`family selector has only ${optionCount} options`);

// --- 4. Section nav ---
const sectionNav = page.locator('nav[aria-label="Playground sections"]');
const navCount = await sectionNav.count();
if (navCount === 1) ok("section nav mounted");
else fail(`section nav: expected 1, found ${navCount}`);

const navChips = sectionNav.locator("a");
const chipCount = await navChips.count();
if (chipCount === 12) ok(`section nav has ${chipCount} chips`);
else fail(`section nav chips: expected 12, found ${chipCount}`);

// --- 5. All 12 sections present ---
const SECTION_IDS = [
  "presets", "scope", "preview", "history", "tokens",
  "sync", "solar", "generator", "animation", "scrollbar",
  "a11y", "studio",
];

for (const id of SECTION_IDS) {
  const count = await page.locator(`#${id}`).count();
  if (count === 1) ok(`section #${id} present`);
  else fail(`section #${id}: expected 1, found ${count}`);
}

// --- 6. Audit badge visible ---
const auditBadge = page.locator('[aria-label*="Audit"]');
const auditCount = await auditBadge.count();
if (auditCount >= 1) ok("audit badge visible");
else fail("audit badge not found");

// --- 7. Preset cards rendered ---
const presetSection = page.locator("#presets");
const useButtons = presetSection.locator('button:has-text("Use this theme"), button:has-text("Applied")');
const useCount = await useButtons.count();
if (useCount >= 5) ok(`${useCount} preset cards rendered`);
else fail(`only ${useCount} preset cards rendered`);

// --- 8. Click a preset card and check override banner ---
const firstUseBtn = useButtons.first();
const btnText = await firstUseBtn.innerText().catch(() => "");
if (btnText === "Applied") {
  ok("first card already applied — skipping click test");
} else {
  await firstUseBtn.click();
  await page.waitForTimeout(800);

  const overrideBanner = page.locator('[role="status"][aria-live="polite"]');
  const overrideCount = await overrideBanner.count();
  if (overrideCount === 1) ok("override banner appeared after preset click");
  else fail(`override banner: expected 1 after click, found ${overrideCount}`);

  // --- 9. Reset button ---
  const resetBtn = overrideBanner.locator('button:has-text("Reset")');
  const resetCount = await resetBtn.count();
  if (resetCount === 1) {
    await resetBtn.click();
    await page.waitForTimeout(500);
    const afterReset = await overrideBanner.count();
    if (afterReset === 0) ok("override banner dismissed after reset");
    else fail("override banner still visible after reset");
  } else {
    fail("reset button not found in override banner");
  }
}

// --- 10. Section nav click scrolls ---
const solarChip = sectionNav.locator('a[href="#solar"]');
await solarChip.click();
await page.waitForTimeout(600);
const url1 = page.url();
if (url1.includes("#solar")) ok("section nav click updates URL hash");
else fail(`URL hash not updated: ${url1}`);

// --- 11. Export menu ---
const exportBtn = page.locator('button[aria-label="Export theme"]');
const exportCount = await exportBtn.count();
if (exportCount === 1) ok("export button present");
else fail(`export button: expected 1, found ${exportCount}`);

await exportBtn.click();
await page.waitForTimeout(300);
const exportMenu = page.locator('[role="menu"]');
const menuCount = await exportMenu.count();
if (menuCount === 1) {
  const menuItems = exportMenu.locator('[role="menuitem"]');
  const itemCount = await menuItems.count();
  if (itemCount === 5) ok(`export menu has ${itemCount} formats`);
  else fail(`export menu items: expected 5, found ${itemCount}`);
} else {
  fail("export menu did not open");
}

// --- 12. Show code panels ---
const showCodeButtons = page.locator('button:has-text("Show code")');
const codeCount = await showCodeButtons.count();
if (codeCount >= 2) ok(`${codeCount} show-code panels found`);
else fail(`expected >=2 show-code panels, found ${codeCount}`);

// --- 13. Mobile section nav (select dropdown) ---
const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobileCtx.newPage();
await mobilePage.goto(`${base}/playground`, { waitUntil: "networkidle", timeout: 90000 });
await mobilePage.waitForTimeout(1500);

const mobileSelect = mobilePage.locator('select[aria-label="Jump to section"]');
const mobileSelectCount = await mobileSelect.count();
if (mobileSelectCount === 1) ok("mobile section nav (select) rendered");
else fail(`mobile select: expected 1, found ${mobileSelectCount}`);

const mobileOptions = mobileSelect.locator("option");
const mobileOptCount = await mobileOptions.count();
if (mobileOptCount >= 12) ok(`mobile select has ${mobileOptCount} options`);
else fail(`mobile select options: expected >=12, found ${mobileOptCount}`);

await mobileCtx.close();

// --- Summary ---
console.log(`\nplayground-smoke failures: ${failures}`);
await ctx.close();
await browser.close();
proc.kill("SIGKILL");
process.exit(failures ? 1 : 0);
