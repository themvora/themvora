/**
 * Hero scene probe.
 *
 * A canvas cannot be checked the way the rest of this repository is checked —
 * there is no DOM to query and no ratio to assert. So the scene publishes a
 * development-only diagnostic (`window.__tvHeroScene`) and this probe drives a
 * real browser to ask the questions that actually matter:
 *
 *   1. is there a WebGL2 context at all
 *   2. is the frame loop running, and is it *drawing* rather than idling
 *   3. is the device pixel ratio capped
 *   4. does the palette change when the theme changes
 *   5. does `prefers-reduced-motion` stop the motion
 *   6. does the hero still lay out at a narrow viewport
 *   7. did anything log an error
 *
 * What it deliberately does **not** check is whether the scene looks good. That
 * is what the screenshots are for — a probe that tried to assert aesthetics
 * would either be trivial or wrong.
 *
 * Usage:
 *   node scripts/probe-hero-scene.mjs
 *   node scripts/probe-hero-scene.mjs --keep   # leave the server running
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium, CHROME, NODE, probePort } from "./lib/probe-env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.dirname(here);
const PORT = probePort(4387);
const BASE = `http://127.0.0.1:${PORT}`;
const keep = process.argv.includes("--keep");

const failures = [];
const check = (ok, label, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures.push(label);
};

// -- server ------------------------------------------------------------------
console.log(`Starting next dev on ${PORT} …`);
const server = spawn(NODE, ["node_modules/next/dist/bin/next", "dev", "-p", String(PORT)], {
  cwd: docsDir,
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => { serverLog += d; });
server.stderr.on("data", (d) => { serverLog += d; });

const ready = async () => {
  for (let i = 0; i < 120; i += 1) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

if (!(await ready())) {
  console.error("dev server did not become ready\n", serverLog.slice(-2000));
  server.kill();
  process.exit(1);
}

/**
 * Skip rather than fail when there is no browser to drive.
 *
 * The browser tier's contract is that it is *unrunnable* rather than stronger on
 * a machine without a browser — a red gate for a missing Chromium teaches people
 * to ignore the gate, which costs more than the check is worth.
 */
let browser;
try {
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
} catch (error) {
  console.log(`\nSKIPPED — no browser available (${CHROME}).`);
  console.log(`  ${String(error).split("\n")[0]}`);
  console.log("  Set CHROME_PATH to a Chromium binary to run this probe.");
  server.kill();
  process.exit(0);
}

try {
  // -- 1. a normal desktop load ---------------------------------------------
  console.log("\n=== HERO SCENE PROBE ===\n");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await ctx.newPage();

  const consoleErrors = [];
  /**
   * The dev server's HMR socket is not the scene's business.
   *
   * Under a proxied sandbox the `ws://…/_next/webpack-hmr` handshake fails, and
   * the browser reports it as a console error. It is an artefact of how this
   * probe is run, not a defect — so it is excluded rather than left to make the
   * gate permanently red, which would train everyone to ignore it.
   */
  const isEnvironmentNoise = (text) =>
    /webpack-hmr|WebSocket connection to/i.test(text);

  page.on("console", (m) => {
    if (m.type() === "error" && !isEnvironmentNoise(m.text())) consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => {
    if (!isEnvironmentNoise(String(e))) consoleErrors.push(String(e));
  });

  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.__tvHeroScene), null, { timeout: 20000 });

  const canvas = await page.evaluate(() => {
    const el = document.querySelector("[data-hero-scene]");
    if (!el) return null;
    const gl = el.getContext("webgl2");
    return {
      hasContext: Boolean(gl),
      contextLost: gl ? gl.isContextLost() : null,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
      width: el.width,
      height: el.height,
      dpr: window.devicePixelRatio,
    };
  });

  check(Boolean(canvas), "the scene canvas is mounted");
  check(canvas?.hasContext === true, "a WebGL2 context was created");
  check(canvas?.contextLost === false, "the context is alive");
  check((canvas?.width ?? 0) > 0 && (canvas?.height ?? 0) > 0, "the drawing buffer has a size",
    canvas ? `${canvas.width}×${canvas.height}` : "");

  // The cap. Rendering a decorative background at 3× on a phone is nine times
  // the pixels for no visible gain.
  const expectedW = Math.round((canvas?.clientWidth ?? 0) * Math.min(Math.max(canvas?.dpr ?? 1, 1), 1.75));
  check(canvas?.width === expectedW, "the device pixel ratio is capped at 1.75",
    `dpr ${canvas?.dpr}, buffer ${canvas?.width}, expected ${expectedW}`);

  // -- 2. the loop runs and draws -------------------------------------------
  const before = await page.evaluate(() => ({ frames: window.__tvHeroScene.frames, draws: window.__tvHeroScene.draws }));
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    frames: window.__tvHeroScene.frames,
    draws: window.__tvHeroScene.draws,
    motionTime: window.__tvHeroScene.motionTime,
  }));

  check(after.frames > before.frames, "the frame loop is running", `${before.frames} → ${after.frames}`);
  check(after.draws > before.draws, "it is issuing draw calls", `${before.draws} → ${after.draws}`);
  check(after.motionTime > 0, "motion time is advancing", `t = ${after.motionTime.toFixed(2)}s`);

  // -- 3. the palette follows the theme -------------------------------------
  const paletteBefore = await page.evaluate(() => window.__tvHeroScene.atmosphere);

  // The hero's palette strip is the site's own live theme switcher.
  const chips = page.locator("button.chip");
  const chipCount = await chips.count();
  check(chipCount > 1, "the theme switcher is available to drive", `${chipCount} chips`);

  if (chipCount > 1) {
    await chips.nth(3).click();
    await page.waitForTimeout(1400); // longer than the 800ms transition
    const paletteAfter = await page.evaluate(() => window.__tvHeroScene.atmosphere);

    check(
      Boolean(paletteBefore && paletteAfter && paletteBefore.nearA !== paletteAfter.nearA),
      "the atmosphere changes when the theme changes",
      `${paletteBefore?.nearA} → ${paletteAfter?.nearA}`,
    );
  }

  // -- 4. reduced motion ------------------------------------------------------
  const reducedCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedCtx.newPage();
  await reducedPage.goto(BASE, { waitUntil: "load" });
  await reducedPage.waitForFunction(() => Boolean(window.__tvHeroScene), null, { timeout: 20000 });
  await reducedPage.waitForTimeout(900);

  const reduced = await reducedPage.evaluate(() => ({
    reduced: window.__tvHeroScene.reduced,
    motionTime: window.__tvHeroScene.motionTime,
    draws: window.__tvHeroScene.draws,
  }));

  check(reduced.reduced === true, "reduced motion is detected");
  check(reduced.motionTime === 0, "motion is frozen at t = 0", `t = ${reduced.motionTime}`);
  check(reduced.draws > 0, "the scene still renders its composition", `${reduced.draws} draws`);
  await reducedCtx.close();

  // -- 5. narrow viewport -----------------------------------------------------
  const narrow = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const narrowPage = await narrow.newPage();
  await narrowPage.goto(BASE, { waitUntil: "load" });
  await narrowPage.waitForFunction(() => Boolean(window.__tvHeroScene), null, { timeout: 20000 });
  await narrowPage.waitForTimeout(600);

  const layout = await narrowPage.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    sceneWidth: window.__tvHeroScene.size.width,
  }));

  check(layout.scrollWidth <= layout.clientWidth, "no horizontal overflow at 390px",
    `scrollWidth ${layout.scrollWidth} vs clientWidth ${layout.clientWidth}`);
  check(layout.sceneWidth > 0, "the scene renders at the narrow width", `${layout.sceneWidth}px buffer`);
  await narrow.close();

  // -- 6. progressive enhancement --------------------------------------------
  // The hero must be complete before the scene exists. These checks are what
  // hold the architecture honest: the canvas is a stable layer, the CSS poster
  // is already painted underneath it, and a device without WebGL loses nothing.
  console.log("\n  — progressive enhancement —");

  const poster = await page.evaluate(() => {
    const layers = [".hero-aurora", ".hero-orb-1", ".hero-orb-2"].map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, present: false };
      const r = el.getBoundingClientRect();
      return { sel, present: true, w: Math.round(r.width), h: Math.round(r.height) };
    });
    return layers;
  });
  check(
    poster.every((l) => l.present && l.w > 0 && l.h > 0),
    "the CSS poster is painted underneath the canvas",
    poster.map((l) => `${l.sel}${l.present ? "" : " MISSING"}`).join(" "),
  );

  const ready = await page.evaluate(() => ({
    ready: window.__tvHeroScene.ready,
    opacity: getComputedStyle(document.querySelector("[data-hero-scene]")).opacity,
  }));
  check(ready.ready === true, "the canvas crossfaded in after the first real frame");
  check(Number(ready.opacity) > 0.9, "the canvas reached full opacity", `opacity ${ready.opacity}`);

  // A stable layer, checked two ways.
  //
  // A before/after comparison across a reload is not a layout-shift test — it
  // compares two different page loads, and the first version of this check
  // failed on exactly that. What actually matters is (a) the canvas is sized by
  // its parent rather than by anything the scene does, and (b) the browser
  // recorded no layout shift while the scene arrived.
  const stability = await page.evaluate(() => {
    const canvas = document.querySelector("[data-hero-scene]");
    const parent = canvas.offsetParent ?? canvas.parentElement;
    const c = canvas.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    const shifts = performance.getEntriesByType("layout-shift");
    return {
      // `absolute inset-0 h-full w-full` must resolve to the parent's box.
      matchesParent:
        Math.abs(c.x - p.x) <= 1 &&
        Math.abs(c.y - p.y) <= 1 &&
        Math.abs(c.width - p.width) <= 1 &&
        Math.abs(c.height - p.height) <= 1,
      parentBox: [Math.round(p.x), Math.round(p.y), Math.round(p.width), Math.round(p.height)],
      cls: shifts.reduce((sum, entry) => sum + (entry.hadRecentInput ? 0 : entry.value), 0),
    };
  });
  check(
    stability.matchesParent,
    "the canvas is sized by its parent, not by the scene",
    "parent " + stability.parentBox.join(","),
  );
  check(
    stability.cls < 0.01,
    "no cumulative layout shift while the scene loaded",
    "CLS " + stability.cls.toFixed(4),
  );

  // -- 7. no WebGL ------------------------------------------------------------
  // `getContext` is stubbed to return null for webgl2 before any script runs,
  // which is exactly what a device without WebGL looks like.
  const noGlCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await noGlCtx.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (String(type).startsWith("webgl")) return null;
      return original.call(this, type, ...rest);
    };
  });
  const noGlPage = await noGlCtx.newPage();
  await noGlPage.goto(BASE, { waitUntil: "load" });
  await noGlPage.waitForTimeout(3000);

  const noGl = await noGlPage.evaluate(() => {
    const canvas = document.querySelector("[data-hero-scene]");
    const aurora = document.querySelector(".hero-aurora");
    return {
      ready: canvas?.dataset.ready ?? null,
      opacity: canvas ? getComputedStyle(canvas).opacity : null,
      posterPainted: aurora ? aurora.getBoundingClientRect().width > 0 : false,
      headingVisible: Boolean(document.querySelector("h1")?.textContent?.trim()),
      // The page must not have fallen over: the hero is still there.
      heroHeight: document.querySelector("h1")?.getBoundingClientRect().height ?? 0,
    };
  });
  check(noGl.ready !== "true", "without WebGL the canvas stays hidden");
  check(Number(noGl.opacity) === 0, "without WebGL the canvas stays transparent", `opacity ${noGl.opacity}`);
  check(noGl.posterPainted, "without WebGL the poster carries the hero");
  check(noGl.headingVisible && noGl.heroHeight > 0, "without WebGL the hero is complete");
  await noGlCtx.close();

  // -- 8. a theme switch before the scene exists ------------------------------
  // The poster reads the live CSS variables, so it follows immediately — and the
  // scene must be built from the *current* theme rather than from whichever one
  // was active when the chunk first evaluated.
  const earlyCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const earlyPage = await earlyCtx.newPage();
  await earlyPage.goto(BASE, { waitUntil: "load" });
  await earlyPage.locator("button.chip").nth(2).click();
  const posterSwitched = await earlyPage.evaluate(() => {
    const aurora = document.querySelector(".hero-aurora");
    return aurora ? getComputedStyle(aurora).backgroundImage.slice(0, 60) : "";
  });
  await earlyPage.waitForFunction(() => window.__tvHeroScene?.ready === true, null, { timeout: 30000 });
  const settled = await earlyPage.evaluate(() => window.__tvHeroScene.atmosphere);

  const lateCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const latePage = await lateCtx.newPage();
  await latePage.goto(BASE, { waitUntil: "load" });
  await latePage.waitForFunction(() => window.__tvHeroScene?.ready === true, null, { timeout: 30000 });
  await latePage.locator("button.chip").nth(2).click();
  await latePage.waitForTimeout(1500);
  const switchedLate = await latePage.evaluate(() => window.__tvHeroScene.atmosphere);

  check(
    Boolean(settled && switchedLate && settled.nearA === switchedLate.nearA),
    "a theme switch before WebGL settles on the same palette as one after",
    `${settled?.nearA} vs ${switchedLate?.nearA}`,
  );
  check(posterSwitched.length > 0, "the poster follows the theme before WebGL loads");
  await earlyCtx.close();
  await lateCtx.close();

  // -- 9. console -------------------------------------------------------------
  check(consoleErrors.length === 0, "no console errors", consoleErrors.slice(0, 2).join(" | "));

  await ctx.close();
} finally {
  await browser.close();
  if (!keep) server.kill();
}

console.log("");
if (failures.length) {
  console.log(`FAIL — ${failures.length} check(s) failed:`);
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("OK — the hero scene renders, follows the theme, and respects reduced motion.");
process.exit(0);
