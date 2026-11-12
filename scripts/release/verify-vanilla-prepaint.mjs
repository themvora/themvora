#!/usr/bin/env node
/**
 * Real-browser verification for the framework-free Vanilla integration.
 *
 * What this proves, and why it is a browser test rather than a unit test:
 *
 *   The zero-flash claim is a claim about *paint order*. It is only true if the
 *   pre-paint asset runs before the browser composites the first frame, and no
 *   unit test can observe that. So every first-paint scenario here blocks
 *   `/src/app.js` at the network layer: with the application module unable to
 *   load, the runtime cannot exist, and whatever the page shows was produced by
 *   the package's pre-paint asset alone. That is the distinction the brief asks
 *   for — the pre-paint bootstrap, not the later application module.
 *
 *   The page is served by the example's own `node server.mjs` (a plain static
 *   file server). There is no Vite process, no bundler and no virtual module in
 *   the path; the script asserts that no request touches `/@vite` and that the
 *   package files arrive from `node_modules`.
 *
 * Scenarios:
 *   first-paint   — fresh, persisted light, persisted dark, persisted family,
 *                   system+light OS, system+dark OS, reload after a change,
 *                   all with the app module blocked and CPU/network throttled.
 *   toggles       — light / dark / system, every family, rapid toggles, family
 *                   change while dark, mode change after a family change.
 *   persistence   — reload after each selection, corrupt storage, absent
 *                   storage.
 *   runtime       — one event per logical change, no duplicate stylesheets, no
 *                   duplicate initialization, instance and document agree.
 *   console       — no errors and no uncaught exceptions anywhere in the run.
 *
 * Usage:
 *   node scripts/release/verify-vanilla-prepaint.mjs
 *   node scripts/release/verify-vanilla-prepaint.mjs --keep-open
 *
 * Requires: `packages/core` built (`pnpm --filter @themvora/core build`), and
 * Chrome or Chromium. Set `THEMVORA_CHROME` to override the browser path.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

/**
 * `--app <dir>` runs the same checks against another copy of the application —
 * the packed-tarball fixture, for instance, which has no workspace link to the
 * monorepo. `--port` keeps two runs from colliding.
 */
const appArg = process.argv.indexOf("--app");
const appRoot =
  appArg !== -1
    ? resolve(process.cwd(), process.argv[appArg + 1])
    : join(repoRoot, "examples", "apps", "vanilla");
const portArg = process.argv.indexOf("--port");
const port = portArg !== -1 ? Number(process.argv[portArg + 1]) : 5206;
const assetPath = join(appRoot, "node_modules", "@themvora", "core", "dist", "prepaint.js");

if (!existsSync(assetPath)) {
  console.error(
    `\n  BLOCKED — ${assetPath} is missing.\n` +
      "  Run: pnpm --filter @themvora/core build  (and install the example's deps)\n",
  );
  process.exit(2);
}

// --- browser ----------------------------------------------------------------

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

// --- static server ----------------------------------------------------------

const server = spawn(process.execPath, ["server.mjs", "--port", String(port)], {
  cwd: appRoot,
  stdio: ["ignore", "pipe", "pipe"],
});

const origin = `http://127.0.0.1:${port}`;
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("the example server did not start")), 10_000);
  server.stdout.on("data", (chunk) => {
    if (String(chunk).includes(`http://127.0.0.1:${port}`)) {
      clearTimeout(timer);
      resolve();
    }
  });
});

// --- CDP --------------------------------------------------------------------

const profileDir = mkdtempSync(join(tmpdir(), "tv-vanilla-"));
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
    "--window-size=1100,900",
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

function connect(port, path) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);
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
        close: () => socket.close(),
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
await send("Network.enable");
await send("Log.enable").catch(() => {});
await send("Fetch.enable", {
  patterns: [
    { urlPattern: "*/src/app.js*" },
    { urlPattern: "*", resourceType: "Document" },
  ],
});

/** Every console error/warning and uncaught exception, for the final verdict. */
const consoleLog = [];
/** Every request URL, to prove the page never touches a Vite endpoint. */
const requests = [];
/** When true, `/src/app.js` is failed at the network layer. */
let blockAppModule = true;
/**
 * Extra configuration spliced into the config element of the served document.
 *
 * The element is static HTML, so a scenario that needs a different runtime
 * option would otherwise need its own fixture on disk. Rewriting the document
 * response keeps one fixture and one server, and still exercises the real
 * `prepaint.js` reading a real `<script type="application/json">`.
 *
 * Kept as an object and serialized here, not as a string at the call site: a
 * hand-written fragment with a stray trailing comma is invalid JSON, and an
 * invalid element is *silently* ignored by design — which makes the scenario
 * look like a failing option instead of a broken fixture.
 */
let injectConfigKeys = null;

cdp.on((message) => {
  if (message.method === "Runtime.consoleAPICalled" && message.sessionId === sessionId) {
    const { type, args } = message.params;
    if (type === "error" || type === "warning") {
      consoleLog.push({
        type,
        text: args.map((arg) => arg.value ?? arg.description ?? "").join(" "),
      });
    }
  }
  if (message.method === "Runtime.exceptionThrown" && message.sessionId === sessionId) {
    consoleLog.push({
      type: "exception",
      text:
        message.params.exceptionDetails?.exception?.description ??
        message.params.exceptionDetails?.text ??
        "uncaught exception",
    });
  }
  if (message.method === "Network.requestWillBeSent" && message.sessionId === sessionId) {
    requests.push(message.params.request.url);
  }
  if (message.method === "Fetch.requestPaused" && message.sessionId === sessionId) {
    const { requestId, request, resourceType } = message.params;
    if (blockAppModule && request.url.includes("/src/app.js")) {
      void send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
      return;
    }
    if (injectConfigKeys && resourceType === "Document") {
      const extra = Object.entries(injectConfigKeys)
        .map(([key, value]) => `"${key}": ${JSON.stringify(value)}`)
        .join(", ");
      const html = readFileSync(join(appRoot, "index.html"), "utf8").replace(
        '"initialMode": "system"',
        `"initialMode": "system", ${extra}`,
      );
      void send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [
          { name: "content-type", value: "text/html; charset=utf-8" },
          { name: "cache-control", value: "no-store" },
        ],
        body: Buffer.from(html, "utf8").toString("base64"),
      });
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

/**
 * Record the theme state at the first frame and again once the load settles.
 *
 * @remarks
 * This runs at `document_start`, where `document.documentElement` does not exist
 * yet — the document is created before the `<html>` element is. So the observer
 * and every snapshot resolve the root *at call time*, and the first sample is
 * taken from the first animation frame, which is the earliest moment the
 * browser could composite anything.
 */
const INSTRUMENT = `(() => {
  window.__tv = { samples: [], mutations: [], observing: false };

  const watch = () => {
    const root = document.documentElement;
    if (!root || window.__tv.observing) return;
    window.__tv.observing = true;
    new MutationObserver((records) => {
      for (const record of records) {
        window.__tv.mutations.push({
          at: Math.round(performance.now()),
          attr: record.attributeName,
          value: root.getAttribute(record.attributeName),
        });
      }
    }).observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "data-theme-mode", "style", "class",
                        "data-theme-selection-mode", "data-theme-selection-family"],
    });
  };

  const snapshot = (tag) => {
    const root = document.documentElement;
    if (!root) return;
    watch();
    const body = document.body;
    const rootStyle = getComputedStyle(root);
    const bodyStyle = body ? getComputedStyle(body) : null;
    window.__tv.samples.push({
      tag,
      at: Math.round(performance.now()),
      readyState: document.readyState,
      theme: root.getAttribute("data-theme"),
      mode: root.getAttribute("data-theme-mode"),
      selectionMode: root.getAttribute("data-theme-selection-mode"),
      selectionFamily: root.getAttribute("data-theme-selection-family"),
      ready: root.getAttribute("data-theme-ready"),
      rootBg: rootStyle.backgroundColor,
      rootColor: rootStyle.color,
      bodyBg: bodyStyle ? bodyStyle.backgroundColor : null,
      bodyColor: bodyStyle ? bodyStyle.color : null,
      backgroundVar: rootStyle.getPropertyValue("--theme-color-background").trim(),
      appModuleRan: Boolean(window.themvora),
    });
  };

  requestAnimationFrame(() => snapshot("raf-1"));
  requestAnimationFrame(() => requestAnimationFrame(() => snapshot("raf-2")));
  window.addEventListener("load", () => snapshot("load"));
  setTimeout(() => snapshot("load+150ms"), 150);
})();`;

await send("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENT });

async function setPreferences({ mode, family } = {}) {
  // Always written as `{ mode, family }`: the runtime's parser requires both
  // fields, so an entry with a missing family reads as "no selection".
  const selection = JSON.stringify({ mode, family: family ?? "default" });
  await evaluate(
    `(() => {
      if (${JSON.stringify(mode ?? null)} === null) localStorage.removeItem("theme-selection");
      else localStorage.setItem("theme-selection", ${JSON.stringify(selection)});
    })()`,
  );
}

async function navigate({ throttle = false } = {}) {
  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: throttle ? 400 : 0,
    downloadThroughput: throttle ? 120 * 1024 : -1,
    uploadThroughput: throttle ? 120 * 1024 : -1,
  });
  await send("Emulation.setCPUThrottlingRate", { rate: throttle ? 8 : 1 });

  const loaded = new Promise((resolve) => {
    const listener = (message) => {
      if (message.method === "Page.loadEventFired" && message.sessionId === sessionId) resolve();
    };
    cdp.on(listener);
  });
  await send("Page.navigate", { url: `${origin}/` });
  await loaded;
  // Two frames plus a task: enough for the module to have run when it is allowed.
  await evaluate(
    "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60))))",
  );
  await send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}

async function state() {
  return evaluate(`(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const kit = window.themvora;
    return {
      theme: root.getAttribute("data-theme"),
      modeAttr: root.getAttribute("data-theme-mode"),
      familyAttr: root.getAttribute("data-theme-family"),
      selectionMode: root.getAttribute("data-theme-selection-mode"),
      selectionFamily: root.getAttribute("data-theme-selection-family"),
      ready: root.getAttribute("data-theme-ready"),
      darkClass: root.classList.contains("dark"),
      colorScheme: style.colorScheme,
      backgroundVar: style.getPropertyValue("--theme-color-background").trim(),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      bodyColor: getComputedStyle(document.body).color,
      inlineVarCount: Array.from(root.style).filter((n) => n.startsWith("--theme-")).length,
      stylesheets: document.querySelectorAll("style").length,
      instance: kit
        ? {
            theme: String(kit.theme.name),
            mode: kit.mode,
            resolvedMode: kit.resolvedMode,
            family: kit.family,
            themes: kit.themes.length,
          }
        : null,
      pressed: Array.from(document.querySelectorAll("[data-mode]")).map((b) => [
        b.dataset.mode,
        b.getAttribute("aria-pressed"),
      ]),
      familyValue: document.querySelector("#family")?.value ?? null,
      readouts: Object.fromEntries(
        Array.from(document.querySelectorAll("[data-tv-readout]")).map((n) => [
          n.getAttribute("data-tv-readout"),
          n.textContent,
        ]),
      ),
    };
  })()`);
}

// --- results ----------------------------------------------------------------

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
  const badge = status.padEnd(7);
  console.log(`  ${badge} ${name}${detail ? ` — ${detail}` : ""}`);
}

function expectEqual(name, actual, expected) {
  if (actual === expected) record(name, "PASS", `${actual}`);
  else record(name, "FAIL", `expected ${expected}, got ${actual}`);
}

const screenshots = [];
async function screenshot(label) {
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const file = join(tmpdir(), `themvora-vanilla-${label}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  screenshots.push(file);
}

// --- 1. first paint, application module blocked ------------------------------

console.log("\n=== 1. FIRST PAINT (application module blocked, CPU 8x, 400 ms latency) ===\n");

const firstPaintCases = [
  {
    name: "fresh visit (no storage, system, light OS)",
    prefs: null,
    emulation: null,
    expect: { theme: "light", mode: "light", selectionMode: "system" },
  },
  {
    name: "persisted light",
    prefs: { mode: "light", family: "default" },
    emulation: null,
    expect: { theme: "light", mode: "light", selectionMode: "light" },
  },
  {
    name: "persisted dark",
    prefs: { mode: "dark", family: "default" },
    emulation: null,
    expect: { theme: "dark", mode: "dark", selectionMode: "dark" },
  },
  {
    name: "persisted family (plum) with light mode",
    prefs: { mode: "light", family: "plum" },
    emulation: null,
    expect: { theme: "plum-light", mode: "light", family: "plum" },
  },
  {
    name: "system mode, OS light",
    prefs: { mode: "system", family: "default" },
    emulation: { prefersDark: false },
    expect: { theme: "light", mode: "light", selectionMode: "system" },
  },
  {
    name: "system mode, OS dark",
    prefs: { mode: "system", family: "default" },
    emulation: { prefersDark: true },
    expect: { theme: "dark", mode: "dark", selectionMode: "system" },
  },
];

blockAppModule = true;

for (const testCase of firstPaintCases) {
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: testCase.emulation?.prefersDark ? "dark" : "light" }],
  });
  await navigate({ throttle: false });
  if (testCase.prefs) await setPreferences(testCase.prefs);
  else await evaluate('localStorage.removeItem("theme-selection")');
  await navigate({ throttle: true });

  const snapshot = await evaluate("window.__tv");
  const samples = snapshot.samples;
  const first = samples[0];
  const last = samples[samples.length - 1];
  // The frames that carry content. A browser may composite an empty canvas
  // while a render-blocking resource is still arriving — that is true of the
  // application stylesheet too, and it is not a wrong-theme flash because there
  // is no content in it. What must never happen is *content* painted with the
  // wrong palette, so the assertions start at the first content-bearing frame.
  const paintedIndex = samples.findIndex((s) => s.bodyBg !== null);
  const painted = samples[paintedIndex] ?? first;
  const afterPaint = samples.slice(paintedIndex);

  console.log(
    `\n  ${testCase.name}  (content at ${painted.at} ms; ` +
      `${paintedIndex} pre-content frame(s))`,
  );
  expectEqual("first content frame theme", painted.theme, testCase.expect.theme);
  expectEqual("first content frame resolved mode", painted.mode, testCase.expect.mode);
  if (testCase.expect.selectionMode) {
    expectEqual("first content frame selection mode", painted.selectionMode, testCase.expect.selectionMode);
  }
  if (testCase.expect.family) {
    expectEqual("first content frame family", painted.selectionFamily, testCase.expect.family);
  }
  expectEqual("first content frame ready marker", painted.ready, "true");
  // The decisive comparison: the palette in the first content-bearing frame is
  // the palette at the end of the load, so nothing repainted in between.
  expectEqual("first painted background == final", painted.bodyBg, last.bodyBg);
  expectEqual("first painted foreground == final", painted.bodyColor, last.bodyColor);
  expectEqual("first painted background variable == final", painted.backgroundVar, last.backgroundVar);
  expectEqual("no repaint between first content frame and load", afterPaint.every((s) => s.bodyBg === painted.bodyBg), true);
  expectEqual("application module never ran", samples.every((s) => s.appModuleRan === false), true);

  // Any theme attribute rewritten after the first content frame would be a
  // second initialization — the runtime re-deriving what was already painted.
  const lateMutations = snapshot.mutations.filter(
    (m) => m.at > painted.at && m.attr !== "style",
  );
  if (lateMutations.length === 0) {
    record("no theme attribute rewritten after content painted", "PASS", "0 mutations");
  } else {
    record("no theme attribute rewritten after content painted", "FAIL", JSON.stringify(lateMutations));
  }
}
// --- 2. toggles with the runtime loaded -------------------------------------

console.log("\n=== 2. MODE AND FAMILY SWITCHING ===\n");

blockAppModule = false;
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "light" }],
});
await evaluate('localStorage.removeItem("theme-selection")');
await navigate();
record("runtime initialized", (await state()).instance ? "PASS" : "FAIL", "");

async function clickMode(mode) {
  await evaluate(`document.querySelector('[data-mode="${mode}"]').click()`);
  await evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
}

async function chooseFamily(family) {
  await evaluate(`(() => {
    const select = document.querySelector("#family");
    select.value = ${JSON.stringify(family)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
}

for (const mode of ["dark", "light", "system", "dark", "light"]) {
  await clickMode(mode);
  const current = await state();
  const resolved = mode === "system" ? "light" : mode;
  console.log(`\n  mode → ${mode}`);
  expectEqual("instance mode", current.instance.mode, mode);
  expectEqual("resolved mode", current.instance.resolvedMode, resolved);
  expectEqual("data-theme-mode", current.modeAttr, resolved);
  expectEqual("data-theme-selection-mode", current.selectionMode, mode);
  expectEqual("dark class", String(current.darkClass), String(resolved === "dark"));
  expectEqual("instance theme matches data-theme", current.instance.theme, current.theme);
  expectEqual(
    "pressed control matches mode",
    current.pressed.filter(([, pressed]) => pressed === "true").map(([name]) => name).join(","),
    mode,
  );
  expectEqual("readout mode", current.readouts.mode, mode);
  expectEqual("readout resolved", current.readouts["effective-mode"], resolved);
}

for (const family of ["plum", "mint", "oat", "cocoa", "default"]) {
  await clickMode("dark");
  await chooseFamily(family);
  const current = await state();
  console.log(`\n  family → ${family} (mode dark)`);
  expectEqual("instance family", current.instance.family, family);
  expectEqual("mode preserved", current.instance.mode, "dark");
  // The default family's variants are named after the mode ("light"/"dark");
  // every other family is prefixed with its own name.
  expectEqual("theme name", current.theme, family === "default" ? "dark" : `${family}-dark`);
  expectEqual("data-theme-family", current.familyAttr, family === "default" ? null : family);
  expectEqual("select value", current.familyValue, family);
  expectEqual("readout family", current.readouts.family, family);
  if (!current.backgroundVar) record("family emitted variables", "FAIL", "no --theme-color-background");
  else record("family emitted variables", "PASS", current.backgroundVar);
}

console.log("\n  family → mint, then mode → light");
await chooseFamily("mint");
await clickMode("light");
const afterFamilyThenMode = await state();
expectEqual("theme", afterFamilyThenMode.theme, "mint-light");
expectEqual("mode", afterFamilyThenMode.instance.mode, "light");
expectEqual("family kept", afterFamilyThenMode.instance.family, "mint");

console.log("\n  rapid toggles");
const before = await state();
for (let i = 0; i < 5; i++) {
  await evaluate('document.querySelector("#toggle").click()');
}
// The runtime suppresses descendant transitions with a temporary stylesheet and
// removes it two frames later; settle before counting so the count is of
// persistent sheets, not of that transient one.
// The runtime suppresses descendant transitions with a temporary stylesheet and
// removes it two frames later; settle before counting so the count is of
// persistent sheets, not of that transient one. The total may also *drop* — a
// finished crossfade removes its timing sheet — so what is asserted is that
// nothing accumulates and nothing is duplicated.
await evaluate("new Promise((r) => setTimeout(r, 400))");
const afterRapid = await state();
expectEqual("odd number of toggles flips the mode", afterRapid.instance.mode, before.instance.mode === "dark" ? "light" : "dark");
expectEqual("instance and document agree", afterRapid.instance.theme, afterRapid.theme);
expectEqual(
  "no stylesheet accumulation across rapid toggles",
  String(afterRapid.stylesheets <= before.stylesheets),
  "true",
);

// --- 3. persistence ---------------------------------------------------------

console.log("\n=== 3. PERSISTENCE ===\n");

await chooseFamily("plum");
await clickMode("dark");
const stored = await evaluate('localStorage.getItem("theme-selection")');
expectEqual("selection written", stored, JSON.stringify({ mode: "dark", family: "plum" }));

blockAppModule = true;
await navigate({ throttle: true });
let snapshot = await evaluate("window.__tv");
let first = snapshot.samples[0];
/** The first frame that carried content — see the note in section 1. */
const contentFrame = (captured) =>
  captured.samples.find((s) => s.bodyBg !== null) ?? captured.samples[0];

first = contentFrame(snapshot);
console.log("\n  reload after changing mode and family (module blocked)");
expectEqual("first content frame theme", first.theme, "plum-dark");
expectEqual("first content frame selection mode", first.selectionMode, "dark");
expectEqual("first content frame family", first.selectionFamily, "plum");
expectEqual(
  "first content frame background == final",
  first.bodyBg,
  snapshot.samples.at(-1).bodyBg,
);

await evaluate('localStorage.setItem("theme-selection", "{ not json")');
await navigate({ throttle: true });
snapshot = await evaluate("window.__tv");
first = contentFrame(snapshot);
console.log("\n  corrupt storage");
expectEqual("falls back to the configured default", first.theme, "light");
expectEqual("still paints a complete palette", Boolean(first.backgroundVar), true);

await evaluate('localStorage.setItem("theme-selection", JSON.stringify({ mode: "dusk", family: 42 }))');
await navigate({ throttle: true });
snapshot = await evaluate("window.__tv");
first = contentFrame(snapshot);
console.log("\n  invalid stored values");
expectEqual("falls back to the configured default", first.theme, "light");

await evaluate('localStorage.removeItem("theme-selection")');
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "dark" }],
});
await navigate({ throttle: true });
snapshot = await evaluate("window.__tv");
first = contentFrame(snapshot);
console.log("\n  no storage, system mode, OS dark");
expectEqual("follows the OS", first.theme, "dark");
expectEqual("selection stays system", first.selectionMode, "system");

// --- 4. runtime consistency -------------------------------------------------

console.log("\n=== 4. RUNTIME CONSISTENCY ===\n");

blockAppModule = false;
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "light" }],
});
await evaluate('localStorage.removeItem("theme-selection")');
await navigate();

const eventLog = await evaluate(`(async () => {
  const log = [];
  window.themvora.on("themeChange", (theme) => log.push(["themeChange", String(theme.name)]));
  window.themvora.on("modeChange", (mode) => log.push(["modeChange", mode]));
  window.themvora.on("familyChange", (family) => log.push(["familyChange", family]));
  window.themvora.setMode("dark");
  // Events are published from the commit, not from the store update: a View
  // Transition applies its callback a task later, so the notification has to
  // wait for the document to agree with it. Reading the log synchronously here
  // would see nothing — which is the contract, not a failure.
  await new Promise((r) => setTimeout(r, 250));
  return log;
})()`);
expectEqual(
  "one event per name on a mode change",
  JSON.stringify(eventLog),
  JSON.stringify([["modeChange", "dark"], ["themeChange", "dark"]]),
);

const familyEvents = await evaluate(`(async () => {
  const log = [];
  window.themvora.setMode("light");
  await new Promise((r) => setTimeout(r, 250));
  const off = window.themvora.on("themeChange", (theme) => log.push(String(theme.name)));
  window.themvora.on("familyChange", (family) => log.push("family:" + family));
  window.themvora.setFamily("mint");
  await new Promise((r) => setTimeout(r, 250));
  off();
  return log;
})()`);
expectEqual(
  "family change emits family then theme",
  JSON.stringify(familyEvents),
  JSON.stringify(["family:mint", "mint-light"]),
);

const instanceCount = await evaluate(`(async () => {
  const before = document.querySelectorAll("style").length;
  window.themvora.setMode("dark");
  window.themvora.setMode("light");
  // Let the transient transition stylesheets settle: one is removed when its
  // crossfade finishes, so an immediate count measures the animation, not
  // accumulation.
  await new Promise((r) => setTimeout(r, 400));
  return {
    before,
    after: document.querySelectorAll("style").length,
    prePaint: document.querySelectorAll("#themvora-pre-paint-css").length,
    timing: document.querySelectorAll("style[data-themvora-view-transition-timing]").length,
    runtimeStyles: document.querySelectorAll("#tv-vars-themvora").length,
  };
})()`);
// The absolute count may drop (a finished crossfade removes its timing sheet),
// so the assertion is that nothing *accumulates* and nothing is duplicated.
expectEqual(
  "no stylesheet accumulation across switches",
  String(instanceCount.after <= instanceCount.before),
  "true",
);
expectEqual("one pre-paint stylesheet", instanceCount.prePaint <= 1, true);
expectEqual("one view-transition timing sheet", instanceCount.timing <= 1, true);
expectEqual("no runtime variable stylesheet", instanceCount.runtimeStyles, 0);

// The runtime commits a theme change inside `startViewTransition`, whose update
// callback runs in a later task, so the DOM is read one frame after the last
// call rather than immediately — reading earlier would measure the transition,
// not the result.
await evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
const consistency = await state();
expectEqual("instance theme == document theme", consistency.instance.theme, consistency.theme);
expectEqual("instance mode == selection attribute", consistency.instance.mode, consistency.selectionMode);
expectEqual("instance family == selection attribute", consistency.instance.family, consistency.selectionFamily);
expectEqual("readout theme == document theme", consistency.readouts.theme, consistency.theme);

// --- 5. frame consistency ---------------------------------------------------

console.log("\n=== 5. FRAME CONSISTENCY ===\n");

/**
 * Sample the document once per animation frame while an interaction runs.
 *
 * Every frame must agree with itself: the theme readout with `data-theme`, and
 * the palette variable with the theme. A mismatch means some part of the page
 * is describing a theme the document is not painting yet — which is what a
 * rapid sequence of clicks turns into visible flicker.
 */
async function measureFrames(label, action) {
  const frames = await evaluate(`(async () => {
    const root = document.documentElement;
    const readout = document.querySelector('[data-tv-readout="theme"]');
    const samples = [];
    let stop = false;
    const tick = () => {
      samples.push({
        bg: getComputedStyle(root).getPropertyValue("--theme-color-background").trim(),
        attr: root.getAttribute("data-theme"),
        text: readout ? readout.textContent : null,
        mode: root.getAttribute("data-theme-mode"),
        effective: document.querySelector('[data-tv-readout="effective-mode"]')?.textContent ?? null,
      });
      if (!stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    ${action}
    await new Promise((r) => setTimeout(r, 1100));
    stop = true;
    return samples;
  })()`);

  const bad = frames.filter(
    (frame) => frame.attr !== frame.text || frame.mode !== frame.effective,
  );
  console.log(`\n  ${label} — ${frames.length} frames, ${new Set(frames.map((f) => f.bg)).size} palettes`);
  if (bad.length === 0) {
    record("every frame consistent", "PASS", "0 mismatched frames");
  } else {
    record("every frame consistent", "FAIL", `${bad.length} mismatched frames`);
    for (const frame of bad.slice(0, 4)) {
      console.log(`     attr=${frame.attr} label=${frame.text} mode=${frame.mode} effective=${frame.effective}`);
    }
  }
}

await measureFrames("single toggle", 'document.querySelector("#toggle").click();');
await evaluate("new Promise((r) => setTimeout(r, 400))");
await measureFrames(
  "5 rapid toggles (40 ms apart)",
  'const t = document.querySelector("#toggle"); for (let i = 0; i < 5; i++) { t.click(); await new Promise((r) => setTimeout(r, 40)); }',
);
await evaluate("new Promise((r) => setTimeout(r, 400))");
await measureFrames(
  "10 rapid toggles (25 ms apart)",
  'const t = document.querySelector("#toggle"); for (let i = 0; i < 10; i++) { t.click(); await new Promise((r) => setTimeout(r, 25)); }',
);
await evaluate("new Promise((r) => setTimeout(r, 400))");
await measureFrames(
  "family cycle plum → mint → oat → cocoa → default",
  'const s = document.querySelector("#family"); for (const f of ["plum","mint","oat","cocoa","default"]) { s.value = f; s.dispatchEvent(new Event("change", { bubbles: true })); await new Promise((r) => setTimeout(r, 60)); }',
);

// --- 6. runtime options declared in the element ------------------------------

console.log("\n=== 6. RUNTIME OPTIONS IN THE CONFIG ELEMENT ===\n");

blockAppModule = false;

/**
 * Load the page with extra keys spliced into the JSON element.
 *
 * The element is the framework-free equivalent of `theme.config.ts`: whatever
 * is declared there travels to the runtime as `window.__THEMVORA_CONFIG__`, so
 * an option that works in the Vite path has to work here too. Each case gets a
 * fresh document, because the asset reads the element exactly once.
 */
async function withConfig(options, body) {
  injectConfigKeys = options;
  await navigate();
  const result = await evaluate(body);
  injectConfigKeys = null;
  return result;
}

const disabled = await withConfig(
  { transition: { enabled: false } },
  `(async () => {
    let calls = 0;
    const original = document.startViewTransition.bind(document);
    document.startViewTransition = (cb) => { calls++; return original(cb); };
    const before = document.documentElement.getAttribute("data-theme");
    document.querySelector("#toggle").click();
    await new Promise((r) => setTimeout(r, 700));
    return {
      transported: window.__THEMVORA_CONFIG__?.transition ?? null,
      calls,
      before,
      after: document.documentElement.getAttribute("data-theme"),
    };
  })()`,
);
console.log("\n  transition: { enabled: false }");
expectEqual("declared in the element", JSON.stringify(disabled.transported), '{"enabled":false}');
expectEqual("no view transition started", disabled.calls, 0);
expectEqual("the theme still changes", disabled.before !== disabled.after, true);

const timed = await withConfig(
  { transition: { enabled: true, duration: 700 } },
  `(async () => {
    let calls = 0;
    const original = document.startViewTransition.bind(document);
    document.startViewTransition = (cb) => { calls++; return original(cb); };
    document.querySelector("#toggle").click();
    await new Promise((r) => setTimeout(r, 120));
    const sheet = document.querySelector("style[data-themvora-view-transition-timing]");
    return {
      calls,
      timing: sheet ? sheet.textContent.replace(/\\s+/g, " ") : null,
    };
  })()`,
);
console.log("\n  transition: { duration: 700 }");
expectEqual("one view transition started", timed.calls, 1);
expectEqual("timing sheet carries the duration", /animation-duration:700ms/.test(timed.timing ?? ""), true);

const scrollbar = await withConfig(
  { scrollbar: true },
  `({
    hidden: document.documentElement.classList.contains("tv-scrollbar"),
    sheets: document.querySelectorAll("[data-themvora-scrollbar-hiding]").length,
  })`,
);
console.log("\n  scrollbar: true");
expectEqual("native scrollbar hidden before paint", scrollbar.hidden, true);
expectEqual("one hiding stylesheet", scrollbar.sheets, 1);

// --- 7. non-Vite execution --------------------------------------------------

console.log("\n=== 7. NON-VITE EXECUTION ===\n");

const viteRequests = requests.filter((url) => /@vite|\/vite\//.test(url));
expectEqual("no Vite endpoint requested", viteRequests.length, 0);
expectEqual(
  "package asset served from node_modules",
  String(requests.some((url) => url.includes("/node_modules/@themvora/core/dist/prepaint.js"))),
  "true",
);
expectEqual(
  "package module served from node_modules",
  String(requests.some((url) => url.includes("/node_modules/@themvora/core/dist/vanilla.js"))),
  "true",
);

// --- 8. screenshots ---------------------------------------------------------

console.log("\n=== 8. SCREENSHOTS ===\n");

blockAppModule = false;
await evaluate('localStorage.removeItem("theme-selection")');
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "light" }],
});
await navigate();
await screenshot("light");

await clickMode("dark");
await screenshot("dark");

await chooseFamily("plum");
await screenshot("plum-dark");

await chooseFamily("mint");
await clickMode("light");
await screenshot("mint-light");

await chooseFamily("cocoa");
await clickMode("system");
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "dark" }],
});
await navigate();
await screenshot("system-dark");

// --- verdict ----------------------------------------------------------------

console.log("\n=== 9. CONSOLE ===\n");

const unexpected = consoleLog.filter(
  (entry) =>
    // The blocked module is reported by the browser as a network failure; that
    // is the mechanism this harness uses, not a page defect.
    !/Failed to load resource/i.test(entry.text) &&
    !/net::ERR_BLOCKED_BY_CLIENT/i.test(entry.text),
);
if (unexpected.length === 0) {
  record("no console errors or uncaught exceptions", "PASS", `${consoleLog.length} network-only entries`);
} else {
  record("no console errors or uncaught exceptions", "FAIL", JSON.stringify(unexpected.slice(0, 4)));
}

console.log("\n=== SUMMARY ===\n");
const counts = results.reduce((acc, entry) => {
  acc[entry.status] = (acc[entry.status] ?? 0) + 1;
  return acc;
}, {});
for (const entry of results.filter((r) => r.status !== "PASS")) {
  console.log(`  ${entry.status} ${entry.name} — ${entry.detail}`);
}
console.log(
  `\n  ${counts.PASS ?? 0} passed, ${counts.FAIL ?? 0} failed, ${counts.BLOCKED ?? 0} blocked ` +
    `(${results.length} checks)\n`,
);
console.log("  Screenshots:");
for (const file of screenshots) console.log(`    ${file}`);
console.log(`\n  Live page: ${origin}/  (served by ${join(appRoot, "server.mjs")})\n`);

if (process.argv.includes("--keep-open")) {
  console.log("  --keep-open: leaving the browser and server running. Ctrl+C to stop.\n");
} else {
  await send("Browser.close").catch(() => {});
  browser.kill();
  server.kill();
}

process.exit(counts.FAIL ? 1 : 0);
