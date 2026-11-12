#!/usr/bin/env node
/* global window, document, getComputedStyle, performance, requestAnimationFrame, localStorage */
/**
 * Real-browser first-paint verification for `examples/apps/web`.
 *
 * The browser globals above are used only inside callbacks this file hands to
 * Playwright (`addInitScript`, `evaluate`), which run in the page — not in Node.
 * ESLint has no block-scoped way to declare them, so they are declared for the
 * file rather than disabling `no-undef` for it: a `document` reference in the
 * Node half is still an error.
 *
 * It proves the contract the Web Components guide makes:
 *
 *   - the generated stylesheet themes ordinary HTML on the first frame;
 *   - the blocking boot script restores a saved non-default selection before
 *     the body is parsed;
 *   - system light/dark is correct with **JavaScript disabled** (CSS-only);
 *   - the runtime adopts the painted state without a second transition;
 *   - a missing pre-paint setup produces the expected diagnostic.
 *
 * It is not a screenshot-after-hydration check. For JS-enabled scenarios the
 * page records the state at the first animation frame after the body exists
 * (`window.__tvFirstPaint`), then the verifier compares that first frame with
 * the final state.
 *
 * Usage:
 *   node scripts/web/first-paint-check.mjs            # dev + production
 *   node scripts/web/first-paint-check.mjs --dev
 *   node scripts/web/first-paint-check.mjs --build
 *
 * Prerequisites:
 *   packages/core + packages/web built, and `pnpm --filter @themvora/app-web build`
 *   for the production pass. Requires Playwright's Chromium (or Chrome/Edge).
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const appRoot = join(repoRoot, "examples", "apps", "web");
const distRoot = join(appRoot, "dist");
const evidenceDir = join(repoRoot, ".badges", "web-first-paint");

const runDev = process.argv.includes("--dev") || !process.argv.includes("--build");
const runBuild = process.argv.includes("--build") || !process.argv.includes("--dev");
const failures = [];
const results = [];

function fail(message) {
  failures.push(message);
  console.log(`  FAIL  ${message}`);
}

function ok(message) {
  console.log(`  ok    ${message}`);
}

function findChrome() {
  if (process.env.THEMVORA_CHROME && existsSync(process.env.THEMVORA_CHROME)) {
    return process.env.THEMVORA_CHROME;
  }
  const pwRoot = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "ms-playwright")
    : join(os.homedir(), "AppData", "Local", "ms-playwright");
  if (existsSync(pwRoot)) {
    const dirs = readdirSync(pwRoot)
      .filter((d) => /^chromium(-\d+)?$/.test(d))
      .sort((a, b) => Number(b.split("-")[1] ?? 0) - Number(a.split("-")[1] ?? 0));
    for (const d of dirs) {
      for (const exe of [
        join(pwRoot, d, "chrome-win64", "chrome.exe"),
        join(pwRoot, d, "chrome-win", "chrome.exe"),
        join(pwRoot, d, "chrome-linux", "chrome"),
        join(pwRoot, d, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
      ]) {
        if (existsSync(exe)) return exe;
      }
    }
  }
  for (const exe of [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]) {
    if (existsSync(exe)) return exe;
  }
  return null;
}

function findPlaywright() {
  const candidates = [
    join(repoRoot, "examples", "apps", "_tools", "node_modules", "playwright-core", "index.mjs"),
    join(repoRoot, "node_modules", "playwright-core", "index.mjs"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

const chrome = findChrome();
const playwrightPath = findPlaywright();
if (!chrome) {
  console.log("SKIP: no Chrome/Chromium found (set THEMVORA_CHROME).");
  process.exit(0);
}
if (!playwrightPath) {
  console.log("SKIP: playwright-core is not installed.");
  process.exit(0);
}

const { chromium } = await import(pathToFileURL(playwrightPath).href);

// --- Servers ---------------------------------------------------------------

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function serveStatic(root) {
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = normalize(join(root, relative));
    if (!file.startsWith(normalize(root)) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function startManual() {
  const corePath = join(repoRoot, "packages", "core", "dist", "index.js");
  const bootPath = join(repoRoot, "packages", "web", "dist", "boot.js");
  const cdnPath = join(repoRoot, "packages", "web", "dist", "cdn.js");
  if (!existsSync(corePath) || !existsSync(bootPath) || !existsSync(cdnPath)) {
    throw new Error("Build @themvora/core and @themvora/web before running the manual check.");
  }

  const core = await import(pathToFileURL(corePath).href);
  const builtIns = core.getBuiltInThemes();
  const pick = (name) => builtIns.find((theme) => String(theme.name) === name);
  const config = {
    themes: [pick("light"), pick("dark"), pick("plum-light"), pick("plum-dark")],
    defaultTheme: "light",
    initialMode: "system",
  };
  const safeJson = JSON.stringify(config).replace(/</g, "\\u003c");
  const css = core.createThemePrePaintCss(config);

  // A non-Vite page: static config, generated CSS, the published boot asset and
  // the standalone component bundle. No plugin, no build step.
  const noPrepaintPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>missing pre-paint setup</title>
  <script>window.__THEMVORA_CONFIG__ = ${safeJson};</script>
  <style>html, body { background: #fff; color: #111; }</style>
</head>
<body>
  <themvora-provider>
    <main><h1>No pre-paint setup</h1><p>ordinary HTML</p></main>
  </themvora-provider>
  <script type="module">
    setTimeout(function () { import("/cdn.js").catch(function () {}); }, 120);
  </script>
</body>
</html>`;

  const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>manual boot</title>
  <script id="themvora-config">window.__THEMVORA_CONFIG__ = ${safeJson};</script>
  <style id="themvora-pre-paint-css">${css}</style>
  <script id="themvora-bootstrap" src="/boot.js"></script>
  <script src="/cdn.js"></script>
  <style>
    html, body { margin: 0; background: var(--theme-color-background); color: var(--theme-color-foreground); }
  </style>
</head>
<body>
  <themvora-provider>
    <main>
      <h1>Manual bootstrap</h1>
      <p>Ordinary HTML content, no Vite plugin.</p>
    </main>
  </themvora-provider>
</body>
</html>`;

  const server = createServer((req, res) => {
    const url = (req.url ?? "/").split("?")[0];
    if (url === "/boot.js") {
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      res.end(readFileSync(bootPath));
      return;
    }
    if (url === "/cdn.js") {
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      res.end(readFileSync(cdnPath));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(url === "/no-prepaint" ? noPrepaintPage : page);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function startDev() {
  const viteBin = join(appRoot, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) {
    throw new Error(`Vite is not installed for ${appRoot}. Run pnpm install.`);
  }
  const port = 5195;
  let stderr = "";
  const child = spawn(
    process.execPath,
    [viteBin, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: appRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  let exited = false;
  child.once("exit", () => {
    exited = true;
  });

  const url = `http://127.0.0.1:${port}/`;
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (exited) break;
    try {
      const response = await fetch(url);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) {
    child.kill();
    throw new Error(
      `Vite dev server did not start${stderr ? `:\n${stderr}` : "."}`,
    );
  }
  return {
    url,
    close: () =>
      new Promise((resolve) => {
        child.once("exit", resolve);
        child.kill();
      }),
  };
}

// --- First-paint recorder --------------------------------------------------

const FIRST_PAINT_SCRIPT = () => {
  window.__tvFrames = [];
  window.__tvConsole = [];
  const originalWarn = console.warn;
  console.warn = function (...args) {
    try {
      window.__tvConsole.push({
        kind: "warn",
        message: String(args[0] ?? ""),
        code: args[1] && typeof args[1] === "object" ? args[1].code ?? null : null,
      });
    } catch {
      /* ignore */
    }
    originalWarn.apply(console, args);
  };

  // One snapshot per animation frame. The frame immediately before the first
  // paint is the state the visitor actually saw; a screenshot taken after load
  // cannot show that. The verifier selects it from these frames.
  const record = () => {
    const root = document.documentElement;
    const body = document.body;
    if (root && body) {
      const rootStyle = getComputedStyle(root);
      const bodyStyle = getComputedStyle(body);
      const scope = document.querySelector("themvora-scope");
      const scopeStyle = scope ? getComputedStyle(scope) : null;
      const scopeParagraph = scope?.querySelector("p");
      const scopeHeading = scope?.querySelector("h2");
      const selects = Array.from(document.querySelectorAll("themvora-select"));
      const familySelect = selects
        .find((element) => element.getAttribute("type") === "family")
        ?.querySelector("select");
      const modeSelect = selects
        .find((element) => element.getAttribute("type") === "mode")
        ?.querySelector("select");
      const toggle = document.querySelector("themvora-toggle");
      const toggleButton = toggle?.querySelector("button");
      window.__tvFrames.push({
        at: performance.now(),
        theme: root.getAttribute("data-theme"),
        mode: root.getAttribute("data-theme-mode"),
        family: root.getAttribute("data-theme-family"),
        ready: root.getAttribute("data-theme-ready"),
        rootBackground: rootStyle.backgroundColor,
        bodyBackground: bodyStyle.backgroundColor,
        color: bodyStyle.color,
        readouts: Array.from(document.querySelectorAll("[data-tv-readout]")).map(
          (node) => [
            node.getAttribute("data-tv-readout"),
            node.textContent,
          ],
        ),
        hasSelect: !!document.querySelector("themvora-select select"),
        hasToggle: !!document.querySelector("themvora-toggle button"),
        familyValue: familySelect?.value ?? null,
        familyOptions: familySelect?.options.length ?? 0,
        modeValue: modeSelect?.value ?? null,
        modeOptions: modeSelect?.options.length ?? 0,
        toggleMode: toggle?.getAttribute("data-mode") ?? null,
        togglePressed: toggleButton?.getAttribute("aria-pressed") ?? null,
        scopeTheme: scope?.getAttribute("data-theme") ?? null,
        scopeBackground: scopeStyle?.backgroundColor ?? null,
        scopeColor: scopeStyle?.color ?? null,
        scopeParagraphColor: scopeParagraph
          ? getComputedStyle(scopeParagraph).color
          : null,
        scopeHeadingColor: scopeHeading
          ? getComputedStyle(scopeHeading).color
          : null,
        hasCss: !!document.getElementById("themvora-pre-paint-css"),
        hasBootstrap: !!document.getElementById("themvora-bootstrap"),
        hasConfig: !!document.getElementById("themvora-config"),
      });
      if (window.__tvFrames.length > 600) window.__tvFrames.shift();
    }
    if (!window.__tvStopFrames) requestAnimationFrame(record);
  };
  requestAnimationFrame(record);

  window.addEventListener("load", () => {
    setTimeout(() => {
      window.__tvStopFrames = true;
    }, 500);
  });
};

async function finalState(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const bodyStyle = getComputedStyle(document.body);
    const paints = performance.getEntriesByType("paint");
    const firstPaint =
      paints.find((entry) => entry.name === "first-paint") ?? paints[0];
    const frames = window.__tvFrames ?? [];
    const atFirstPaint = firstPaint
      ? [...frames].reverse().find((frame) => frame.at <= firstPaint.startTime)
      : frames[0];
    return {
      theme: root.getAttribute("data-theme"),
      mode: root.getAttribute("data-theme-mode"),
      family: root.getAttribute("data-theme-family"),
      ready: root.getAttribute("data-theme-ready"),
      bodyBackground: bodyStyle.backgroundColor,
      color: bodyStyle.color,
      console: window.__tvConsole ?? [],
      paints: paints.map((entry) => ({
        name: entry.name,
        startTime: Number(entry.startTime.toFixed(1)),
      })),
      atFirstPaint: atFirstPaint ?? null,
      frames: frames.map((frame) => ({
        at: Number(frame.at.toFixed(1)),
        scopeBackground: frame.scopeBackground,
        scopeParagraphColor: frame.scopeParagraphColor,
        scopeHeadingColor: frame.scopeHeadingColor,
        readouts: frame.readouts,
        hasSelect: frame.hasSelect,
        hasToggle: frame.hasToggle,
        familyValue: frame.familyValue,
        modeValue: frame.modeValue,
        toggleMode: frame.toggleMode,
        togglePressed: frame.togglePressed,
      })),
    };
  });
}

function expectEqual(label, actual, expected) {
  if (actual === expected) ok(`${label}: ${actual}`);
  else fail(`${label}: expected ${expected}, received ${actual}`);
}

async function assertScenario(browser, base, scenario) {
  const context = await browser.newContext({
    colorScheme: scenario.colorScheme,
    viewport: { width: 1280, height: 800 },
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(FIRST_PAINT_SCRIPT);
    if (scenario.saved) {
      await page.addInitScript((selection) => {
        try {
          localStorage.setItem("theme-selection", JSON.stringify(selection));
        } catch {
          /* storage blocked: the scenario is invalid, but let the page load */
        }
      }, scenario.saved);
    }

    await page.goto(base, { waitUntil: "load" });
    await page.waitForTimeout(350);

    const final = await finalState(page);
    const first = final.atFirstPaint;

    if (!first) {
      fail(`${scenario.name}: no first-paint frame was captured`);
      return;
    }

    expectEqual(`${scenario.name} first theme`, first.theme, scenario.expectedTheme);
    expectEqual(`${scenario.name} first ready`, first.ready, "true");
    expectEqual(`${scenario.name} final theme`, final.theme, scenario.expectedTheme);
    expectEqual(`${scenario.name} final ready`, final.ready, "true");
    expectEqual(
      `${scenario.name} first background`,
      first.bodyBackground,
      scenario.expectedBackground,
    );
    expectEqual(
      `${scenario.name} final background`,
      final.bodyBackground,
      scenario.expectedBackground,
    );
    expectEqual(
      `${scenario.name} first text`,
      first.color,
      scenario.expectedColor,
    );

    if (first.theme !== final.theme || first.bodyBackground !== final.bodyBackground) {
      fail(`${scenario.name}: the painted frame changed after runtime initialization`);
    } else {
      ok(`${scenario.name}: first frame equals final frame (no correction)`);
    }

    expectEqual(`${scenario.name} generated CSS`, first.hasCss, true);
    expectEqual(`${scenario.name} blocking boot`, first.hasBootstrap, true);
    expectEqual(`${scenario.name} transported config`, first.hasConfig, true);

    const paintNames = final.paints
      .map((paint) => `${paint.name}@${paint.startTime}ms`)
      .join(", ");
    ok(
      `${scenario.name}: first computed state at ${first.at.toFixed(1)} ms` +
        (paintNames ? `; paint [${paintNames}]` : ""),
    );

    const diagnostics = final.console.filter(
      (entry) =>
        entry.code === "TV_PREPAINT_MISSING" || entry.code === "TV_PREPAINT_MISMATCH",
    );
    expectEqual(`${scenario.name} pre-paint diagnostics`, diagnostics.length, 0);

    if (scenario.expectUi) {
      const readouts = Object.fromEntries(first.readouts ?? []);
      for (const [key, expected] of Object.entries(
        scenario.expectedReadouts ?? {},
      )) {
        expectEqual(
          `${scenario.name} first readout "${key}"`,
          readouts[key],
          expected,
        );
      }
      expectEqual(
        `${scenario.name} first select upgraded`,
        first.hasSelect,
        true,
      );
      expectEqual(
        `${scenario.name} first toggle upgraded`,
        first.hasToggle,
        true,
      );
      expectEqual(
        `${scenario.name} first family options`,
        first.familyOptions > 0,
        true,
      );
      expectEqual(
        `${scenario.name} first mode options`,
        first.modeOptions > 0,
        true,
      );
      const controls = scenario.expectedControls ?? {};
      expectEqual(
        `${scenario.name} first family select`,
        first.familyValue,
        controls.familyValue,
      );
      expectEqual(
        `${scenario.name} first mode select`,
        first.modeValue,
        controls.modeValue,
      );
      expectEqual(
        `${scenario.name} first toggle mode`,
        first.toggleMode,
        controls.toggleMode,
      );
      expectEqual(
        `${scenario.name} first toggle pressed`,
        first.togglePressed,
        controls.togglePressed,
      );
      expectEqual(
        `${scenario.name} first scope background`,
        first.scopeBackground,
        "rgb(7, 7, 8)",
      );
      expectEqual(
        `${scenario.name} first scope text`,
        first.scopeColor,
        "rgb(238, 238, 240)",
      );
      expectEqual(
        `${scenario.name} first scope theme`,
        first.scopeTheme,
        "plum-dark",
      );

      // The first frame can be correct while a later frame still settles. Check
      // every frame where the scope, readouts or controls exist, not only the
      // frame before first paint.
      const scopeFrames = final.frames.filter(
        (frame) => frame.scopeBackground !== null,
      );
      expectEqual(
        `${scenario.name} scope appeared in frames`,
        scopeFrames.length > 0,
        true,
      );
      const unstableScope = scopeFrames.filter(
        (frame) =>
          frame.scopeBackground !== "rgb(7, 7, 8)" ||
          (frame.scopeParagraphColor !== null &&
            frame.scopeParagraphColor !== "rgb(164, 164, 166)") ||
          (frame.scopeHeadingColor !== null &&
            frame.scopeHeadingColor !== "rgb(238, 238, 240)"),
      );
      expectEqual(
        `${scenario.name} unstable scope frames`,
        unstableScope.length,
        0,
      );
      if (unstableScope.length > 0) {
        fail(
          `${scenario.name}: scope changed after it appeared at ${unstableScope
            .slice(0, 3)
            .map((frame) => frame.at)
            .join(", ")} ms`,
        );
      }

      const readoutFrames = final.frames.filter(
        (frame) => (frame.readouts?.length ?? 0) >= 4,
      );
      const unstableReadouts = readoutFrames.filter((frame) => {
        const map = Object.fromEntries(frame.readouts);
        return Object.entries(scenario.expectedReadouts ?? {}).some(
          ([key, expected]) => map[key] !== expected,
        );
      });
      expectEqual(
        `${scenario.name} unstable readout frames`,
        unstableReadouts.length,
        0,
      );

      const controlFrames = final.frames.filter(
        (frame) => frame.hasSelect && frame.hasToggle,
      );
      const expectedControls2 = scenario.expectedControls ?? {};
      const unstableControls = controlFrames.filter(
        (frame) =>
          frame.familyValue !== expectedControls2.familyValue ||
          frame.modeValue !== expectedControls2.modeValue ||
          frame.toggleMode !== expectedControls2.toggleMode ||
          frame.togglePressed !== expectedControls2.togglePressed,
      );
      expectEqual(
        `${scenario.name} unstable control frames`,
        unstableControls.length,
        0,
      );
    }

    mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({
      path: join(evidenceDir, `${scenario.name}.png`),
      fullPage: false,
    });

    results.push({
      scenario: scenario.name,
      mode: scenario.colorScheme,
      first: {
        theme: first.theme,
        background: first.bodyBackground,
        color: first.color,
        at: Number(first.at.toFixed(1)),
        paints: first.paints,
      },
      final: { theme: final.theme, background: final.bodyBackground },
    });
  } finally {
    await context.close();
  }
}

async function assertNoJavaScript(browser, base, scenario) {
  const context = await browser.newContext({
    colorScheme: scenario.colorScheme,
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 800 },
  });
  try {
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "load" });
    await page.waitForTimeout(200);

    const client = await context.newCDPSession(page);
    await client.send("DOM.enable");
    await client.send("CSS.enable");
    const { root } = await client.send("DOM.getDocument");
    const styles = {};
    for (const selector of ["html", "body"]) {
      const { nodeId } = await client.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector,
      });
      const { computedStyle } = await client.send("CSS.getComputedStyleForNode", {
        nodeId,
      });
      styles[selector] = Object.fromEntries(
        computedStyle.map((entry) => [entry.name, entry.value]),
      );
    }

    expectEqual(
      `${scenario.name} html background (CSS only)`,
      styles.html?.["background-color"],
      scenario.expectedBackground,
    );
    expectEqual(
      `${scenario.name} body background (CSS only)`,
      styles.body?.["background-color"],
      scenario.expectedBackground,
    );
    expectEqual(
      `${scenario.name} text colour (CSS only)`,
      styles.body?.color,
      scenario.expectedColor,
    );

    mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({
      path: join(evidenceDir, `${scenario.name}.png`),
      fullPage: false,
    });

    results.push({
      scenario: scenario.name,
      mode: scenario.colorScheme,
      javascript: false,
      computed: {
        background: styles.body?.["background-color"],
        color: styles.body?.color,
      },
    });
  } finally {
    await context.close();
  }
}

async function assertSavedAfterReload(browser, base) {
  const context = await browser.newContext({
    colorScheme: "light",
    viewport: { width: 1280, height: 800 },
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(FIRST_PAINT_SCRIPT);
    await page.goto(base, { waitUntil: "load" });
    await page.click("#pick-plum");
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-theme") === "plum-light",
    );
    await page.waitForTimeout(150);

    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(350);

    const final = await finalState(page);
    const first = final.atFirstPaint;

    if (!first) {
      fail("saved-after-reload: no first-paint frame was captured");
      return;
    }
    expectEqual("saved-after-reload first theme", first.theme, "plum-light");
    expectEqual("saved-after-reload first ready", first.ready, "true");
    expectEqual("saved-after-reload final theme", final.theme, "plum-light");
    expectEqual(
      "saved-after-reload first background",
      first.bodyBackground,
      "rgb(237, 236, 238)",
    );
    expectEqual(
      "saved-after-reload first text",
      first.color,
      "rgb(27, 26, 28)",
    );
    expectEqual(
      "saved-after-reload diagnostics",
      final.console.filter(
        (entry) =>
          entry.code === "TV_PREPAINT_MISSING" ||
          entry.code === "TV_PREPAINT_MISMATCH",
      ).length,
      0,
    );

    const readouts = Object.fromEntries(first.readouts ?? []);
    expectEqual("saved-after-reload readout theme", readouts.theme, "plum-light");
    expectEqual(
      "saved-after-reload readout effective-mode",
      readouts["effective-mode"],
      "light",
    );
    expectEqual("saved-after-reload readout family", readouts.family, "plum");
    expectEqual("saved-after-reload readout mode", readouts.mode, "system");
    expectEqual("saved-after-reload select upgraded", first.hasSelect, true);
    expectEqual("saved-after-reload toggle upgraded", first.hasToggle, true);
    expectEqual(
      "saved-after-reload family select",
      first.familyValue,
      "plum",
    );
    expectEqual("saved-after-reload mode select", first.modeValue, "system");
    expectEqual("saved-after-reload toggle mode", first.toggleMode, "system");
    expectEqual(
      "saved-after-reload toggle pressed",
      first.togglePressed,
      "mixed",
    );
    expectEqual(
      "saved-after-reload scope background",
      first.scopeBackground,
      "rgb(7, 7, 8)",
    );
    ok("saved-after-reload: runtime selection persisted and painted first");

    results.push({
      scenario: "saved-after-reload",
      mode: "light",
      first: {
        theme: first.theme,
        background: first.bodyBackground,
        color: first.color,
        at: Number(first.at.toFixed(1)),
        paints: final.paints,
      },
      final: { theme: final.theme, background: final.bodyBackground },
    });
  } finally {
    await context.close();
  }
}

async function assertMissingDiagnostic(browser, base) {
  const context = await browser.newContext({
    colorScheme: "light",
    viewport: { width: 1280, height: 800 },
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(FIRST_PAINT_SCRIPT);
    await page.goto(`${base}no-prepaint`, { waitUntil: "load" });
    await page.waitForTimeout(700);

    const entries = await page.evaluate(() => window.__tvConsole ?? []);
    const missing = entries.some((entry) => entry.code === "TV_PREPAINT_MISSING");
    if (missing) ok("no-prepaint reports TV_PREPAINT_MISSING");
    else fail("no-prepaint did not report TV_PREPAINT_MISSING");

    const duplicates = entries.filter(
      (entry) => entry.code === "TV_PREPAINT_MISSING",
    ).length;
    expectEqual("no-prepaint diagnostic count", duplicates, 1);
  } finally {
    await context.close();
  }
}

// --- Run -------------------------------------------------------------------

const browser = await chromium.launch({ executablePath: chrome, headless: true });

const scenarios = [
  {
    name: "system-light",
    colorScheme: "light",
    expectUi: true,
    expectedTheme: "harbor-light",
    expectedBackground: "rgb(233, 243, 238)",
    expectedColor: "rgb(19, 29, 24)",
    expectedReadouts: {
      theme: "harbor-light",
      "effective-mode": "light",
      family: "harbor",
      mode: "system",
    },
    expectedControls: {
      familyValue: "harbor",
      modeValue: "system",
      toggleMode: "system",
      togglePressed: "mixed",
    },
  },
  {
    name: "system-dark",
    colorScheme: "dark",
    expectUi: true,
    expectedTheme: "harbor-dark",
    expectedBackground: "rgb(17, 24, 20)",
    expectedColor: "rgb(232, 241, 236)",
    expectedReadouts: {
      theme: "harbor-dark",
      "effective-mode": "dark",
      family: "harbor",
      mode: "system",
    },
    expectedControls: {
      familyValue: "harbor",
      modeValue: "system",
      toggleMode: "system",
      togglePressed: "mixed",
    },
  },
  {
    name: "saved-plum-dark",
    colorScheme: "light",
    saved: { mode: "dark", family: "plum" },
    expectUi: true,
    expectedTheme: "plum-dark",
    expectedBackground: "rgb(7, 7, 8)",
    expectedColor: "rgb(238, 238, 240)",
    expectedReadouts: {
      theme: "plum-dark",
      "effective-mode": "dark",
      family: "plum",
      mode: "dark",
    },
    expectedControls: {
      familyValue: "plum",
      modeValue: "dark",
      toggleMode: "dark",
      togglePressed: "true",
    },
  },
];

try {
  if (runBuild) {
    console.log("\n=== FIRST PAINT — production build ===\n");
    if (!existsSync(join(distRoot, "index.html"))) {
      throw new Error("examples/apps/web/dist is missing. Run the app build first.");
    }
    const server = await serveStatic(distRoot);
    try {
      for (const scenario of scenarios) {
        await assertScenario(browser, server.url, scenario);
      }
      await assertSavedAfterReload(browser, server.url);
      await assertNoJavaScript(browser, server.url, {
        name: "no-js-dark",
        colorScheme: "dark",
        expectedBackground: "rgb(17, 24, 20)",
        expectedColor: "rgb(232, 241, 236)",
      });
    } finally {
      await server.close();
    }
  }

  console.log("\n=== FIRST PAINT — manual bootstrap (no plugin) ===\n");
  {
    const manual = await startManual();
    try {
      await assertScenario(browser, manual.url, {
        name: "manual-system-dark",
        colorScheme: "dark",
        expectedTheme: "dark",
        expectedBackground: "rgb(9, 9, 10)",
        expectedColor: "rgb(238, 238, 240)",
      });
      await assertScenario(browser, manual.url, {
        name: "manual-saved-plum-dark",
        colorScheme: "light",
        saved: { mode: "dark", family: "plum" },
        expectedTheme: "plum-dark",
        expectedBackground: "rgb(7, 7, 8)",
        expectedColor: "rgb(238, 238, 240)",
      });
      await assertNoJavaScript(browser, manual.url, {
        name: "manual-no-js-dark",
        colorScheme: "dark",
        expectedBackground: "rgb(9, 9, 10)",
        expectedColor: "rgb(238, 238, 240)",
      });
      await assertMissingDiagnostic(browser, manual.url);
    } finally {
      await manual.close();
    }
  }

  if (runDev) {
    console.log("\n=== FIRST PAINT — Vite dev server ===\n");
    const dev = await startDev();
    try {
      for (const scenario of scenarios) {
        await assertScenario(browser, dev.url, scenario);
      }
      await assertNoJavaScript(browser, dev.url, {
        name: "no-js-dark-dev",
        colorScheme: "dark",
        expectedBackground: "rgb(17, 24, 20)",
        expectedColor: "rgb(232, 241, 236)",
      });
    } finally {
      await dev.close();
    }
  }
} finally {
  await browser.close();
}

console.log("\n=== SUMMARY ===");
for (const result of results) {
  const theme = result.first?.theme ?? result.computed?.background;
  console.log(
    `  ${result.scenario.padEnd(18)} ${
      result.javascript === false ? "no-js" : result.mode
    }  ${theme}`,
  );
}
console.log(`  evidence: ${evidenceDir}`);

if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s).`);
  process.exit(1);
}
console.log("\nAll first-paint checks passed.");
