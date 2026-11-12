#!/usr/bin/env node
/**
 * Real-browser verification for the Vite delivery of the Vanilla integration.
 *
 * Two things are proved here that a build log cannot show:
 *
 *   1. **First paint.** The plugin inlines the blocking script, so the theme
 *      must be on `<html>` before the application module runs. Every first-paint
 *      scenario blocks `/assets/*.js` at the network layer: with the module
 *      unable to load, the runtime cannot exist, and whatever the page shows was
 *      produced by the injected pre-paint assets alone.
 *
 *   2. **Frame consistency.** For each interaction the harness samples the
 *      document once per animation frame and asserts that the label, the
 *      `data-theme` attribute, the `--theme-color-background` variable and the
 *      scoped region all agree *in every frame*. This is the check that catches
 *      the "theme flickers when you click quickly" class of defect: the runtime
 *      commits a change inside a View Transition, whose update callback runs a
 *      task after the store update, so anything rendered from the store's own
 *      notification is one frame ahead of the pixels.
 *
 * Usage:
 *   node scripts/release/verify-vanilla-vite.mjs
 *
 * Requires: `pnpm --filter @themvora/app-vanilla-js build`, and Chrome/Chromium
 * (set `THEMVORA_CHROME` to override the browser path).
 */

import { spawn } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const appRoot = join(repoRoot, "examples", "apps", "vanilla-js");
const distRoot = join(appRoot, "dist");
const port = 5211;

if (!existsSync(join(distRoot, "index.html"))) {
  console.error(
    "\n  BLOCKED — examples/apps/vanilla-js/dist is missing.\n" +
      "  Run: pnpm --filter @themvora/app-vanilla-js build\n",
  );
  process.exit(2);
}

function findChrome() {
  if (process.env.THEMVORA_CHROME && existsSync(process.env.THEMVORA_CHROME)) {
    return process.env.THEMVORA_CHROME;
  }
  const playwrightRoot = join(
    process.env.LOCALAPPDATA ?? join(process.env.HOME ?? "", "AppData", "Local"),
    "ms-playwright",
  );
  if (existsSync(playwrightRoot)) {
    const dirs = readdirSync(playwrightRoot)
      .filter((entry) => /^chromium(-\d+)?$/.test(entry))
      .sort((a, b) => Number(b.split("-")[1] ?? 0) - Number(a.split("-")[1] ?? 0));
    for (const dir of dirs) {
      for (const exe of [
        join(playwrightRoot, dir, "chrome-win64", "chrome.exe"),
        join(playwrightRoot, dir, "chrome-win", "chrome.exe"),
        join(playwrightRoot, dir, "chrome-linux", "chrome"),
      ]) {
        if (existsSync(exe)) return exe;
      }
    }
  }
  for (const exe of [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]) {
    if (existsSync(exe)) return exe;
  }
  return null;
}

const chromePath = findChrome();
if (!chromePath) {
  console.log("\n  BLOCKED — no Chrome/Chromium found (set THEMVORA_CHROME).\n");
  process.exit(2);
}

// --- static server for the production build --------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const file =
    url.pathname === "/"
      ? join(distRoot, "index.html")
      : join(distRoot, decodeURIComponent(url.pathname));

  if (!existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
});

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${port}`;

// --- browser ----------------------------------------------------------------

const profileDir = mkdtempSync(join(tmpdir(), "tv-vanilla-vite-"));
const browser = spawn(
  chromePath,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const portFile = join(profileDir, "DevToolsActivePort");
for (let i = 0; i < 120 && !existsSync(portFile); i++) {
  await new Promise((resolve) => setTimeout(resolve, 100));
}
const [cdpPort, browserPath = "/devtools/browser"] = readFileSync(portFile, "utf8")
  .split("\n")
  .map((line) => line.trim());

function connect(portNumber, path) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${portNumber}${path}`);
    let id = 0;
    const pending = new Map();
    const listeners = new Set();

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const entry = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      for (const listener of listeners) listener(message);
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
        on: (listener) => listeners.add(listener),
      }),
    );
    socket.addEventListener("error", reject);
  });
}

const cdp = await connect(Number(cdpPort), browserPath);
const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
const send = (method, params = {}) => cdp.send(method, params, sessionId);

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable").catch(() => {});
// The module is a hashed asset, so the pattern is the build's asset directory.
await send("Fetch.enable", { patterns: [{ urlPattern: "*/assets/*.js" }] });

const consoleLog = [];
let blockModule = false;

cdp.on((message) => {
  if (message.sessionId !== sessionId) return;
  if (message.method === "Runtime.consoleAPICalled") {
    const { type, args } = message.params;
    if (type === "error" || type === "warning") {
      consoleLog.push({ type, text: args.map((a) => a.value ?? a.description ?? "").join(" ") });
    }
  }
  if (message.method === "Runtime.exceptionThrown") {
    consoleLog.push({
      type: "exception",
      text:
        message.params.exceptionDetails?.exception?.description ??
        message.params.exceptionDetails?.text ??
        "uncaught exception",
    });
  }
  if (message.method === "Fetch.requestPaused") {
    const { requestId, request } = message.params;
    if (blockModule && /\/assets\/.*\.js/.test(request.url)) {
      void send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
      return;
    }
    void send("Fetch.continueRequest", { requestId });
  }
});

async function evaluate(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }
  return result.value;
}

async function setSelection(mode, family) {
  await evaluate(
    `localStorage.setItem("theme-selection", ${JSON.stringify(
      JSON.stringify({ mode, family }),
    )})`,
  );
}

async function navigate({ throttle = false } = {}) {
  await send("Emulation.setCPUThrottlingRate", { rate: throttle ? 8 : 1 });
  const loaded = new Promise((resolve) => {
    const listener = (message) => {
      if (message.method === "Page.loadEventFired" && message.sessionId === sessionId) resolve();
    };
    cdp.on(listener);
  });
  await send("Page.navigate", { url: `${origin}/` });
  await loaded;
  await evaluate(
    "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60))))",
  );
  await send("Emulation.setCPUThrottlingRate", { rate: 1 });
}

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`  ${status.padEnd(7)} ${name}${detail ? ` — ${detail}` : ""}`);
}
function expectEqual(name, actual, expected) {
  if (actual === expected) record(name, "PASS", String(actual));
  else record(name, "FAIL", `expected ${expected}, got ${actual}`);
}

// --- 1. first paint with the module blocked --------------------------------

console.log("\n=== 1. FIRST PAINT (application module blocked) ===\n");

blockModule = true;

const firstPaintCases = [
  { name: "fresh visit (system, light OS)", selection: null, expect: { theme: "light", mode: "light" } },
  { name: "persisted dark", selection: { mode: "dark", family: "default" }, expect: { theme: "dark", mode: "dark" } },
  { name: "persisted plum", selection: { mode: "light", family: "plum" }, expect: { theme: "plum-light", mode: "light", family: "plum" } },
];

for (const testCase of firstPaintCases) {
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "light" }],
  });
  await navigate();
  if (testCase.selection) {
    await setSelection(testCase.selection.mode, testCase.selection.family);
  } else {
    await evaluate('localStorage.removeItem("theme-selection")');
  }
  await navigate({ throttle: true });

  const state = await evaluate(`(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    return {
      theme: root.getAttribute("data-theme"),
      mode: root.getAttribute("data-theme-mode"),
      family: root.getAttribute("data-theme-selection-family"),
      backgroundVar: style.getPropertyValue("--theme-color-background").trim(),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      readout: document.querySelector('[data-tv-readout="theme"]')?.textContent ?? null,
      // The module sets this label in its first render; the bootstrap does not.
      moduleRan: document.querySelector("#toggle")?.hasAttribute("aria-label") ?? false,
      prepaintStyleCount: document.querySelectorAll("#themvora-pre-paint-css").length,
      bootstrapScripts: document.querySelectorAll("#themvora-bootstrap").length,
    };
  })()`);

  console.log(`\n  ${testCase.name}`);
  expectEqual("theme", state.theme, testCase.expect.theme);
  expectEqual("resolved mode", state.mode, testCase.expect.mode);
  if (testCase.expect.family) expectEqual("family", state.family, testCase.expect.family);
  expectEqual("application module not loaded", state.moduleRan, false);
  expectEqual("readout already correct", state.readout, testCase.expect.theme);
  expectEqual("exactly one pre-paint stylesheet", state.prepaintStyleCount, 1);
  expectEqual("exactly one bootstrap script", state.bootstrapScripts, 1);
  expectEqual("paints a palette", Boolean(state.backgroundVar), true);
}

// --- 2. frame consistency ---------------------------------------------------

console.log("\n=== 2. FRAME CONSISTENCY (runtime loaded) ===\n");

blockModule = false;
await evaluate('localStorage.removeItem("theme-selection")');
await navigate();

const measure = async (label, action) => {
  const frames = await evaluate(`(async () => {
    const root = document.documentElement;
    const label = document.querySelector('[data-tv-readout="theme"]');
    const scope = document.querySelector("#scope");
    const frames = [];
    let stop = false;
    const tick = () => {
      frames.push({
        bg: getComputedStyle(root).getPropertyValue("--theme-color-background").trim(),
        attr: root.getAttribute("data-theme"),
        text: label.textContent,
        scopeBg: scope ? getComputedStyle(scope).getPropertyValue("--theme-color-background").trim() : null,
      });
      if (!stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    ${action}
    await new Promise((r) => setTimeout(r, 1100));
    stop = true;
    return frames;
  })()`);

  // Every frame must agree: the label with the attribute, and the scoped region
  // with the page.
  const bad = frames.filter(
    (frame) => frame.attr !== frame.text || (frame.scopeBg && frame.scopeBg !== frame.bg),
  );
  const palettes = new Set(frames.map((frame) => frame.bg)).size;

  console.log(`\n  ${label} — ${frames.length} frames, ${palettes} palettes`);
  if (bad.length === 0) {
    record("every frame consistent", "PASS", "0 mismatched frames");
  } else {
    record("every frame consistent", "FAIL", `${bad.length} mismatched frames`);
    for (const frame of bad.slice(0, 4)) {
      console.log(`     attr=${frame.attr} label=${frame.text} bg=${frame.bg} scope=${frame.scopeBg}`);
    }
  }
};

await measure("single toggle", 'document.querySelector("#toggle").click();');
await new Promise((resolve) => setTimeout(resolve, 400));
await measure(
  "5 rapid toggles (40 ms apart)",
  'const t = document.querySelector("#toggle"); for (let i = 0; i < 5; i++) { t.click(); await new Promise((r) => setTimeout(r, 40)); }',
);
await new Promise((resolve) => setTimeout(resolve, 400));
await measure(
  "10 rapid toggles (25 ms apart)",
  'const t = document.querySelector("#toggle"); for (let i = 0; i < 10; i++) { t.click(); await new Promise((r) => setTimeout(r, 25)); }',
);
await new Promise((resolve) => setTimeout(resolve, 400));
await measure(
  "family cycle plum → mint → oat → cocoa → default",
  'const s = document.querySelector("#family"); for (const f of ["plum","mint","oat","cocoa","default"]) { s.value = f; s.dispatchEvent(new Event("change", { bubbles: true })); await new Promise((r) => setTimeout(r, 60)); }',
);
await new Promise((resolve) => setTimeout(resolve, 400));
await measure(
  "mode cycle dark → light → system → dark",
  // The `${m}` is the page's own template literal, not this module's: it is
  // escaped so Node emits it verbatim for the browser to evaluate.
  `for (const m of ["dark","light","system","dark"]) { document.querySelector(\`[data-mode="\${m}"]\`).click(); await new Promise((r) => setTimeout(r, 120)); }`,
);

// --- 3. final state ---------------------------------------------------------

console.log("\n=== 3. FINAL STATE ===\n");

const finalState = await evaluate(`(() => {
  const root = document.documentElement;
  return {
    theme: root.getAttribute("data-theme"),
    selectionMode: root.getAttribute("data-theme-selection-mode"),
    selectionFamily: root.getAttribute("data-theme-selection-family"),
    readouts: Object.fromEntries(
      Array.from(document.querySelectorAll("[data-tv-readout]")).map((n) => [
        n.getAttribute("data-tv-readout"),
        n.textContent,
      ]),
    ),
    pressed: Array.from(document.querySelectorAll(".segmented [data-mode]")).map((b) => [
      b.dataset.mode,
      b.getAttribute("aria-pressed"),
    ]),
    scopeTheme: document.querySelector("#scope")?.getAttribute("data-theme") ?? null,
    scrollbarHidden: document.documentElement.classList.contains("tv-scrollbar"),
    // One host per axis; only the vertical one has a visible thumb on this page.
    overlayVertical: document.querySelectorAll("[data-themvora-host].tv-v").length,
    overlayThumbs: document.querySelectorAll("[data-themvora-host] .tv-thumb").length,
    stylesheets: document.querySelectorAll("style").length,
  };
})()`);

expectEqual("readout theme == document", finalState.readouts.theme, finalState.theme);
expectEqual("readout mode == selection", finalState.readouts.mode, finalState.selectionMode);
expectEqual(
  "pressed control == selection",
  finalState.pressed.filter(([, pressed]) => pressed === "true").map(([mode]) => mode).join(","),
  finalState.selectionMode,
);
expectEqual("scoped region follows the page", finalState.scopeTheme, finalState.theme);
// The example draws an overlay scrollbar (`themvoraVitePlugin({ scrollbar: true })`
// + `createOverlayScrollbar`), so the native bar must be hidden before paint and
// the overlay must actually exist — otherwise the page has no scrollbar at all.
expectEqual("native scrollbar hidden", finalState.scrollbarHidden, true);
expectEqual("one vertical overlay scrollbar", finalState.overlayVertical, 1);
expectEqual("the overlay draws a thumb", finalState.overlayThumbs >= 1, true);

// --- 4. screenshots + console ----------------------------------------------

console.log("\n=== 4. SCREENSHOTS + CONSOLE ===\n");

const shots = [];
for (const [name, action] of [
  ["light", 'document.querySelector(\'[data-mode="light"]\').click()'],
  ["dark", 'document.querySelector(\'[data-mode="dark"]\').click()'],
  [
    "plum-dark",
    'const s = document.querySelector("#family"); s.value = "plum"; s.dispatchEvent(new Event("change", { bubbles: true }));',
  ],
]) {
  await evaluate(action);
  await evaluate("new Promise((r) => setTimeout(r, 400))");
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const file = join(tmpdir(), `themvora-vite-${name}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  shots.push(file);
}

const unexpected = consoleLog.filter(
  (entry) =>
    !/Failed to load resource/i.test(entry.text) &&
    !/net::ERR_BLOCKED_BY_CLIENT/i.test(entry.text),
);
if (unexpected.length === 0) {
  record("no console errors or uncaught exceptions", "PASS", `${consoleLog.length} network-only entries`);
} else {
  record("no console errors or uncaught exceptions", "FAIL", JSON.stringify(unexpected.slice(0, 3)));
}

// --- verdict ----------------------------------------------------------------

const counts = results.reduce((acc, entry) => {
  acc[entry.status] = (acc[entry.status] ?? 0) + 1;
  return acc;
}, {});

console.log("\n=== SUMMARY ===\n");
for (const entry of results.filter((r) => r.status !== "PASS")) {
  console.log(`  ${entry.status} ${entry.name} — ${entry.detail}`);
}
console.log(
  `\n  ${counts.PASS ?? 0} passed, ${counts.FAIL ?? 0} failed (${results.length} checks)\n`,
);
console.log("  Screenshots:");
for (const file of shots) console.log(`    ${file}`);
console.log(`\n  Build served from ${distRoot}\n`);

await send("Browser.close").catch(() => {});
browser.kill();
server.close();
process.exit(counts.FAIL ? 1 : 0);
