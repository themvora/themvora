#!/usr/bin/env node
/**
 * Real-browser check for the React + MUI integration.
 *
 * The jsdom suite proves the theme *object* is right. It cannot prove what the
 * browser does with it during a theme switch: whether MUI's computed styles move
 * with the document's CSS variables, whether the animation coordinator's
 * descendant-transition suppression is active at that moment, or whether reduced
 * motion still short-circuits the whole thing.
 *
 * This script bundles `test/browser/fixture.jsx`, serves it, drives headless
 * Chrome over CDP, samples computed styles frame by frame across a light→dark
 * and a dark→light switch, and prints what actually happened.
 *
 * Usage: node packages/adapters/mui/scripts/browser-check.mjs [--strict]
 * Requires: packages/{react,mui,core}/dist (build the packages first).
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const muiDir = join(here, "..");
const repoRoot = join(muiDir, "..", "..", "..");
const fixture = join(muiDir, "test", "browser", "fixture.jsx");
const outDir = join(os.tmpdir(), `tv-mui-browser-${process.pid}`);
const strict = process.argv.includes("--strict");

const failures = [];
const notes = [];

function skip(message) {
  console.log(`\n=== MUI — BROWSER CHECK ===\n\n  SKIP — ${message}\n`);
  process.exit(strict ? 1 : 0);
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

function findEsbuild() {
  const pnpm = join(repoRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpm)) return null;
  const dirs = readdirSync(pnpm)
    .filter((d) => /^esbuild@\d/.test(d))
    .sort((a, b) => b.localeCompare(a));
  for (const d of dirs) {
    const entry = join(pnpm, d, "node_modules", "esbuild", "lib", "main.js");
    if (existsSync(entry)) return entry;
  }
  return null;
}

const chrome = findChrome();
if (!chrome) skip("no Chrome/Chromium found (set THEMVORA_CHROME)");

for (const required of [
  join(repoRoot, "packages/core/dist/index.js"),
  join(repoRoot, "packages/react/dist/index.js"),
  join(muiDir, "dist/index.js"),
]) {
  if (!existsSync(required)) skip(`${required} is missing — build the packages first`);
}

const esbuildPath = findEsbuild();
if (!esbuildPath) skip("esbuild is not installed in the workspace store");

// --- Bundle the fixture -----------------------------------------------------
const { build } = await import(`file://${esbuildPath.replaceAll("\\", "/")}`);

mkdirSync(outDir, { recursive: true });
await build({
  entryPoints: [fixture],
  outfile: join(outDir, "fixture.js"),
  bundle: true,
  format: "esm",
  jsx: "automatic",
  absWorkingDir: muiDir,
  define: { "process.env.NODE_ENV": '"production"' },
  // The fixture lives inside the MUI package, which does not depend on
  // `@themvora/react` or on itself; both are aliased to the built packages so
  // this stays a test-only fixture with no manifest change.
  alias: {
    "@themvora/react": join(repoRoot, "packages/react/dist/index.js"),
    "@themvora/mui": join(muiDir, "dist/index.js"),
  },
  logLevel: "silent",
});

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>themvora mui browser check</title>
  <style>
    /* The application's own font: a Google-style stack on the document, never
       given to Themvora as a token. MUI must inherit it. */
    body { font-family: "Inter", "Segoe UI", system-ui, sans-serif; margin: 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/fixture.js"></script>
</body>
</html>`;

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  if (url.startsWith("/fixture.js")) {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    res.end(readFileSync(join(outDir, "fixture.js")));
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(PAGE);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

// --- Browser + CDP ----------------------------------------------------------
const profileDir = join(os.tmpdir(), `tv-mui-profile-${process.pid}`);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "about:blank",
  ],
  { stdio: "ignore", detached: true },
);
browser.unref();

const portFile = join(profileDir, "DevToolsActivePort");
for (let i = 0; i < 80 && !existsSync(portFile); i++) {
  await new Promise((r) => setTimeout(r, 250));
}
if (!existsSync(portFile)) skip("the browser did not expose a CDP endpoint");

const [cdpPortRaw, browserPath = "/devtools/browser"] = readFileSync(portFile, "utf8")
  .split("\n")
  .map((s) => s.trim());

const WebSocketImpl = globalThis.WebSocket;
if (!WebSocketImpl) skip("this Node has no global WebSocket for the CDP transport");

function connect(port, path) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocketImpl(`ws://127.0.0.1:${port}${path}`);
    let id = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const entry = pending.get(message.id);
        pending.delete(message.id);
        message.error
          ? entry.reject(new Error(message.error.message))
          : entry.resolve(message.result);
      }
    });
    socket.addEventListener("open", () =>
      resolve({
        send: (method, params = {}, sessionId) =>
          new Promise((res, rej) => {
            const messageId = ++id;
            pending.set(messageId, { resolve: res, reject: rej });
            socket.send(
              JSON.stringify(
                sessionId
                  ? { sessionId, id: messageId, method, params }
                  : { id: messageId, method, params },
              ),
            );
          }),
      }),
    );
    socket.addEventListener("error", reject);
  });
}

const cdp = await connect(Number(cdpPortRaw), browserPath);
const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
const send = (method, params) => cdp.send(method, params, sessionId);

await send("Runtime.enable");
await send("Page.enable");

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
  }
  return result.result.value;
}

async function waitFor(expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(expression)) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

async function load() {
  await send("Page.navigate", { url: origin });
  const ready = await waitFor("Boolean(window.__tv && window.__tv.ready)");
  if (!ready) throw new Error("the fixture never became ready");
  // One frame so Emotion's first stylesheet is applied before sampling.
  await evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
}

/**
 * Sample computed styles every frame for `ms`, starting immediately.
 *
 * Recorded per frame: the animating flag the coordinator sets, the document's
 * `--theme-color-background` (which is what interpolates), and MUI's own
 * computed backgrounds and transition properties.
 */
const SAMPLER = (ms) => `(async () => {
  const html = document.documentElement;
  const button = document.getElementById("mui-button");
  const paper = document.getElementById("mui-paper");
  const plain = document.getElementById("plain");
  const text = document.getElementById("mui-text");
  const samples = [];
  const start = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const cs = getComputedStyle(html);
      const btn = getComputedStyle(button);
      samples.push({
        t: Math.round(performance.now() - start),
        animating: html.hasAttribute("data-themvora-animating"),
        dark: html.classList.contains("dark"),
        dataTheme: html.getAttribute("data-theme"),
        varBg: cs.getPropertyValue("--theme-color-background").trim(),
        plainBg: getComputedStyle(plain).backgroundColor,
        buttonBg: btn.backgroundColor,
        buttonTransitionProperty: btn.transitionProperty,
        buttonTransitionDuration: btn.transitionDuration,
        paperBg: getComputedStyle(paper).backgroundColor,
        textFont: getComputedStyle(text).fontFamily,
      });
      if (performance.now() - start < ${ms}) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  return samples;
})()`;

/**
 * Normalise any CSS colour to `rgb(r, g, b)`.
 *
 * Necessary because a registered `@property` with `syntax: "<color>"` computes
 * to `rgb(...)`, and MUI returns `rgb(...)` too — comparing against the source
 * hex would never match, which is exactly how the first run of this script
 * reported "final at frame -1" for values that had in fact landed.
 */
function toRgb(value) {
  if (typeof value !== "string") return value;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full, 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  }
  return value.replace(/\s+/g, " ").trim();
}

/** The first frame at which a value reaches `target`, or -1. */
function firstAt(samples, key, target) {
  return samples.findIndex((s) => s[key] === target);
}

/** How many distinct intermediate values a property passed through. */
function intermediates(samples, key, from, to) {
  const seen = new Set();
  for (const sample of samples) {
    if (sample[key] !== from && sample[key] !== to) seen.add(sample[key]);
  }
  return seen.size;
}

async function runSwitch(label, mode, palette) {
  const before = await evaluate("window.__tv.getMode()");
  const fromBg = toRgb(palette.fromBackground);
  const toBg = toRgb(palette.toBackground);
  const fromButton = toRgb(palette.fromPrimary);
  const toButton = toRgb(palette.toPrimary);
  const fromPaper = toRgb(palette.fromCard);
  const toPaper = toRgb(palette.toCard);

  const samples = await evaluate(`(() => {
    const p = ${SAMPLER(900)};
    window.__tv.setMode(${JSON.stringify(mode)});
    return p;
  })()`);

  const swapIndex = samples.findIndex((s) => s.dark === (mode === "dark"));
  const buttonFinal = firstAt(samples, "buttonBg", toButton);
  const paperFinal = firstAt(samples, "paperBg", toPaper);
  const varFinal = firstAt(samples, "varBg", toBg);

  const buttonIntermediate = intermediates(samples, "buttonBg", fromButton, toButton);
  const paperIntermediate = intermediates(samples, "paperBg", fromPaper, toPaper);
  const varIntermediate = intermediates(samples, "varBg", fromBg, toBg);
  const animatingFrames = samples.filter((s) => s.animating).length;
  const atSwap = samples[swapIndex] ?? samples[0];

  console.log(`\n--- ${label} (${before} → ${mode}) ---`);
  console.log(`  frames sampled            ${samples.length}`);
  console.log(`  swap frame                ${swapIndex}`);
  console.log(`  --theme-color-background  final at frame ${varFinal}, ${varIntermediate} intermediate value(s)`);
  console.log(`  MUI Button background     final at frame ${buttonFinal}, ${buttonIntermediate} intermediate value(s)`);
  console.log(`  MUI Paper background      final at frame ${paperFinal}, ${paperIntermediate} intermediate value(s)`);
  console.log(`  data-themvora-animating   ${animatingFrames} frame(s)`);
  console.log(`  at swap frame             animating=${atSwap.animating} transition-property=${atSwap.buttonTransitionProperty} duration=${atSwap.buttonTransitionDuration}`);

  return {
    samples,
    swapIndex,
    varFinal,
    buttonFinal,
    paperFinal,
    varIntermediate,
    buttonIntermediate,
    paperIntermediate,
    animatingFrames,
    atSwap,
  };
}

const report = {};

try {
  await load();

  const metrics = await evaluate(`(() => ({
    muiFontFamily: window.__tv.muiFontFamily,
    muiDurations: window.__tv.muiDurations,
    muiEasing: window.__tv.muiEasing,
    transition: window.__tv.transition,
    muiTextFont: getComputedStyle(document.getElementById("mui-text")).fontFamily,
    bodyFont: getComputedStyle(document.body).fontFamily,
  }))()`);

  console.log("\n=== MUI — BROWSER CHECK ===");
  console.log("\n--- configuration ---");
  console.log(`  Themvora transition       ${JSON.stringify(metrics.transition)}`);
  console.log(`  MUI duration.standard     ${metrics.muiDurations.standard}`);
  console.log(`  MUI easing.easeInOut      ${metrics.muiEasing.easeInOut}`);
  console.log(`  MUI typography fontFamily ${JSON.stringify(metrics.muiFontFamily)}`);
  console.log(`  body font                 ${metrics.bodyFont}`);
  console.log(`  MUI text computed font    ${metrics.muiTextFont}`);

  if (metrics.muiDurations.standard !== metrics.transition.duration) {
    failures.push(
      `MUI duration.standard is ${metrics.muiDurations.standard}, Themvora's is ${metrics.transition.duration}`,
    );
  }
  if (metrics.muiEasing.easeInOut !== metrics.transition.easing) {
    failures.push(
      `MUI easing.easeInOut is ${metrics.muiEasing.easeInOut}, Themvora's is ${metrics.transition.easing}`,
    );
  }
  if (!metrics.muiTextFont.includes("Inter")) {
    failures.push(`MUI text is not inheriting the document font (got ${metrics.muiTextFont})`);
  }

  report.lightToDark = await runSwitch("light → dark", "dark", {
    fromBackground: "#ffffff",
    toBackground: "#0b1120",
    fromPrimary: "#2563eb",
    toPrimary: "#60a5fa",
    fromCard: "#f4f4f5",
    toCard: "#111c33",
  });
  report.darkToLight = await runSwitch("dark → light", "light", {
    fromBackground: "#0b1120",
    toBackground: "#ffffff",
    fromPrimary: "#60a5fa",
    toPrimary: "#2563eb",
    fromCard: "#111c33",
    toCard: "#f4f4f5",
  });

  // Reduced motion: the same switch must complete without any animation window.
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await load();
  const reduced = await evaluate(`(() => {
    const p = ${SAMPLER(400)};
    window.__tv.setMode("dark");
    return p;
  })()`);
  const reducedAnimating = reduced.filter((s) => s.animating).length;
  const reducedIntermediate = intermediates(reduced, "varBg", toRgb("#ffffff"), toRgb("#0b1120"));
  console.log("\n--- reduced motion (light → dark) ---");
  console.log(`  data-themvora-animating   ${reducedAnimating} frame(s)`);
  console.log(`  --theme-color-background  ${reducedIntermediate} intermediate value(s)`);
  report.reducedMotion = { animating: reducedAnimating, intermediates: reducedIntermediate };

  if (reducedAnimating > 0) {
    failures.push(`reduced motion still ran an animation window (${reducedAnimating} frames)`);
  }
  if (reducedIntermediate > 0) {
    failures.push(`reduced motion still interpolated the variables (${reducedIntermediate} values)`);
  }

  // --- Interpretation -------------------------------------------------------
  for (const [label, run] of [
    ["light → dark", report.lightToDark],
    ["dark → light", report.darkToLight],
  ]) {
    if (run.varFinal === -1) failures.push(`${label}: the document variables never reached the new theme`);
    if (run.buttonFinal === -1) failures.push(`${label}: the MUI button never reached the new palette`);
    if (run.swapIndex === -1) failures.push(`${label}: the document never switched theme`);

    // The MUI theme must move with the swap, not after it. A frame or two of
    // scheduling slack is normal; a visible lag would be many frames.
    const lag = run.buttonFinal - run.swapIndex;
    if (lag > 3) {
      failures.push(`${label}: MUI's palette landed ${lag} frames after the document swap`);
    }

    // The coordinator mutes descendant transitions for the animation window;
    // that is what keeps MUI's own 150ms transition from double-easing the
    // interpolated variables. Assert it was actually active at the swap.
    if (run.animatingFrames === 0) {
      failures.push(`${label}: the animation coordinator never marked the document as animating`);
    }
    if (!run.atSwap.animating) {
      failures.push(`${label}: the swap frame was not inside the animation window`);
    }

    console.log(`\n  ${label}: MUI palette landed ${lag} frame(s) after the swap; ` +
      `document interpolated ${run.varIntermediate} value(s), MUI ${run.buttonIntermediate}`);
    if (run.buttonIntermediate === 0) {
      notes.push(
        `${label}: MUI surfaces switch at the swap frame without interpolating — ` +
          `MUI owns literal palette values, so its Emotion rules cannot inherit the ` +
          `interpolating custom properties. They are not stale: they land on the same frame.`,
      );
    }
  }
} catch (error) {
  failures.push(`the check threw: ${error.message}`);
} finally {
  try {
    await cdp.send("Browser.close");
  } catch {}
  server.close();
  rmSync(outDir, { recursive: true, force: true });
  // Chrome releases its profile asynchronously; a locked file here must not
  // turn a passing check into a crash.
  try {
    rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    /* best effort — the OS cleans %TEMP% */
  }
}

if (notes.length > 0) {
  console.log("\n--- observations ---");
  for (const note of notes) console.log(`  · ${note}`);
}

if (failures.length > 0) {
  console.log("\n--- failures ---");
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  console.log("\nExit: FAIL\n");
  process.exit(1);
}

console.log("\nExit: OK — MUI follows the same selection change as the document.\n");
