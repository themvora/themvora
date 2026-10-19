#!/usr/bin/env node
/**
 * Real-browser check for `@themvora/web`.
 *
 * The jsdom suite proves the element contract in a simulated DOM. This script
 * proves it in a browser: a plain HTML page loads `dist/cdn.js` with a
 * `<script src>` (no bundler, no import map), and every scenario below runs
 * against the real custom-element lifecycle, the real CSS cascade and the real
 * console.
 *
 * Scenarios:
 *   1. cdn-boot          — the standalone bundle registers every element and
 *                          injects one stylesheet; the provider paints a theme.
 *   2. live-attributes   — `default-theme` / `themes` writes apply in the same
 *                          task, with no navigation (immediacy evidence).
 *   3. reconnect         — removing and re-adding the provider recreates the
 *                          runtime without duplicating the toggle's listeners.
 *   4. fallback          — an empty catalog falls back to the neutral pair and
 *                          an unknown scope theme falls back to the catalog's
 *                          first theme, both reported.
 *   5. diagnostics       — the diagnostic codes reach the real console.
 *   6. cleanup           — removing a scope restores its inline style; removing
 *                          the provider restores `<html>`.
 *
 * Infrastructure-skip: when a browser or the `ws` CDP transport is unavailable
 * the script reports SKIP and exits 0; pass `--strict` to fail instead.
 *
 * Usage:
 *   node scripts/web/browser-check.mjs [--strict]
 * Requires:
 *   packages/web/dist/cdn.js (run the package build first).
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const webRoot = join(repoRoot, "packages", "web");
const cdnPath = join(webRoot, "dist", "cdn.js");
const strict = process.argv.includes("--strict");

const failures = [];

function skip(message) {
  console.log(`\n=== WEB COMPONENTS — BROWSER CHECK ===\n\n  SKIP — ${message}\n`);
  if (strict) {
    console.log("--strict: treating skip as a failure.");
    process.exit(1);
  }
  process.exit(0);
}

// --- Locate a browser -------------------------------------------------------
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

// --- Locate the `ws` CDP transport -----------------------------------------
function findWs() {
  const nm = join(repoRoot, "node_modules");
  const candidates = [];
  if (existsSync(join(nm, "ws"))) candidates.push(join(nm, "ws"));
  const pnpm = join(nm, ".pnpm");
  if (existsSync(pnpm)) {
    for (const d of readdirSync(pnpm)) {
      if (/^ws@\d+\.\d+\.\d+$/.test(d)) candidates.push(join(pnpm, d, "node_modules", "ws"));
    }
  }
  candidates.sort((a, b) => b.localeCompare(a));
  for (const c of candidates) {
    if (existsSync(join(c, "package.json"))) return c;
  }
  return null;
}

const chrome = findChrome();
const wsPath = findWs();
if (!chrome) skip("no Chrome/Chromium found (set THEMVORA_CHROME)");
if (!wsPath) skip("the `ws` package is not installed (needed for the CDP transport)");
if (!existsSync(cdnPath)) skip("packages/web/dist/cdn.js not found — build the package first");

const { default: WebSocket } = await import(`file://${wsPath.replaceAll("\\", "/")}/index.js`);

// --- Fixture page -----------------------------------------------------------
// Deliberately plain: one `<script src>`, no modules, no build step. Every
// element below is authored in HTML and must upgrade on its own.
const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>web components browser check</title>
  <script src="/cdn.js"></script>
</head>
<body>
  <themvora-provider id="p" themes="light dark berry-light berry-dark" default-theme="light">
    <themvora-toggle id="toggle"></themvora-toggle>
    <themvora-select id="select" type="family" label="Theme family"></themvora-select>
    <themvora-scope id="scope" theme="berry-dark">
      <p id="scoped">scoped content</p>
    </themvora-scope>
  </themvora-provider>
</body>
</html>`;

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  if (url.startsWith("/cdn.js")) {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    res.end(readFileSync(cdnPath));
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(PAGE);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

// --- Browser + CDP ----------------------------------------------------------
const profileDir = join(os.tmpdir(), `tv-web-browser-${process.pid}`);
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

function connect(port, path) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);
    let id = 0;
    const pending = new Map();
    const listeners = new Set();
    socket.on("message", (raw) => {
      const message = JSON.parse(raw);
      if (message.id && pending.has(message.id)) {
        const entry = pending.get(message.id);
        pending.delete(message.id);
        message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
        return;
      }
      for (const listener of listeners) listener(message);
    });
    socket.on("open", () =>
      resolve({
        send: (method, params = {}, sessionId) =>
          new Promise((res, rej) => {
            const messageId = ++id;
            pending.set(messageId, { resolve: res, reject: rej });
            socket.send(
              JSON.stringify(
                sessionId ? { sessionId, id: messageId, method, params } : { id: messageId, method, params },
              ),
            );
          }),
        on: (listener) => listeners.add(listener),
      }),
    );
    socket.on("error", reject);
  });
}

const cdp = await connect(Number(cdpPortRaw), browserPath);
const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
const send = (method, params) => cdp.send(method, params, sessionId);

await send("Runtime.enable");
await send("Page.enable");
await send("Log.enable").catch(() => {});

/** Console + exception records for the scenario currently running. */
let consoleEntries = [];
cdp.on((message) => {
  if (message.method === "Runtime.consoleAPICalled") {
    const { type, args } = message.params;
    if (type !== "error" && type !== "warning") return;
    const codes = args
      .map((arg) => arg.preview?.properties?.find((p) => p.name === "code")?.value ?? arg.value)
      .filter((value) => typeof value === "string");
    consoleEntries.push({ type, codes, text: args.map((a) => a.value ?? a.description ?? "").join(" ") });
  }
  if (message.method === "Runtime.exceptionThrown") {
    consoleEntries.push({
      type: "exception",
      codes: [],
      text: message.params.exceptionDetails?.exception?.description ?? "uncaught exception",
    });
  }
});

async function load(url) {
  // A persisted selection legitimately outranks `initial-mode`, and the
  // previous scenario's toggle wrote one. Clear it before the page boots so
  // every scenario starts from the authored state.
  await send("Storage.clearDataForOrigin", {
    origin,
    storageTypes: "local_storage,session_storage",
  });
  const loaded = new Promise((resolve) => {
    const listener = (message) => {
      if (message.method === "Page.loadEventFired") resolve();
    };
    cdp.on(listener);
  });
  await send("Page.navigate", { url });
  await loaded;
  // The bundle is a classic script; give the elements one task to upgrade.
  await evaluate(`new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))`);
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text ?? "evaluation failed");
  }
  return result.value;
}

const scenarios = [];
function scenario(name, body, check) {
  scenarios.push({ name, body, check });
}

// --- 1. The standalone bundle ----------------------------------------------
scenario(
  "cdn-boot",
  `(async () => {
    const tags = ["themvora-provider", "themvora-scope", "themvora-toggle", "themvora-select", "themvora-inspector", "themvora-scrollbar"];
    await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
    const provider = document.getElementById("p");
    await customElements.whenDefined("themvora-provider");
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    return {
      registered: tags.filter((tag) => !!customElements.get(tag)),
      globalApi: typeof window.ThemvoraWeb?.defineCustomElements === "function",
      stylesheets: document.querySelectorAll("#themvora-elements-style").length,
      theme: document.documentElement.getAttribute("data-theme"),
      mode: document.documentElement.getAttribute("data-theme-mode"),
      toggleRendered: !!provider.querySelector("themvora-toggle button svg"),
      selectOptions: Array.from(provider.querySelectorAll("themvora-select option")).map((o) => o.value),
    };
  })()`,
  (result) => {
    const all = ["themvora-provider", "themvora-scope", "themvora-toggle", "themvora-select", "themvora-inspector", "themvora-scrollbar"];
    if (result.registered.length !== all.length) {
      return `not registered: ${all.filter((t) => !result.registered.includes(t)).join(", ")}`;
    }
    if (!result.globalApi) return "window.ThemvoraWeb.defineCustomElements is missing";
    if (result.stylesheets !== 1) return `expected 1 component stylesheet, found ${result.stylesheets}`;
    if (result.theme !== "light") return `expected data-theme="light", got ${result.theme}`;
    if (result.mode !== "light") return `expected data-theme-mode="light", got ${result.mode}`;
    if (!result.toggleRendered) return "the toggle did not render its button + icon";
    if (!result.selectOptions.includes("berry")) return `family options: ${result.selectOptions.join(",")}`;
    return null;
  },
);

// --- 2. Live attribute changes, no navigation -------------------------------
scenario(
  "live-attributes",
  `(async () => {
    window.__tvMarker = "alive";
    const provider = document.getElementById("p");
    const html = document.documentElement;
    // When the browser supports View Transitions the provider commits the new
    // variables inside the transition's swap, i.e. on the next frame. "Same
    // frame" is therefore the contract to assert, not "same call stack".
    const settle = () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))));

    const start = html.getAttribute("data-theme");

    const t0 = performance.now();
    provider.setAttribute("default-theme", "berry-dark");
    await settle();
    const afterDefault = html.getAttribute("data-theme");
    const defaultMs = performance.now() - t0;

    const t1 = performance.now();
    provider.setAttribute("themes", "light dark berry-light berry-dark");
    provider.setAttribute("default-theme", "dark");
    await settle();
    const afterCatalog = html.getAttribute("data-theme");
    const catalogMs = performance.now() - t1;

    const t2 = performance.now();
    provider.setAttribute("initial-mode", "light");
    await settle();
    const afterMode = html.getAttribute("data-theme");
    const modeMs = performance.now() - t2;

    return {
      start,
      afterDefault,
      afterCatalog,
      afterMode,
      defaultMs,
      catalogMs,
      modeMs,
      marker: window.__tvMarker,
      navigations: performance.getEntriesByType("navigation").length,
    };
  })()`,
  (result) => {
    if (result.start !== "light") return `unexpected start theme ${result.start}`;
    if (result.afterDefault !== "berry-dark") return `default-theme did not apply: ${result.afterDefault}`;
    if (result.afterCatalog !== "dark") return `themes + default-theme did not apply: ${result.afterCatalog}`;
    // Documented precedence: `initialMode` wins the mode over `defaultTheme`.
    if (result.afterMode !== "light") return `initial-mode=light did not apply: ${result.afterMode}`;
    if (result.marker !== "alive") return "the page reloaded";
    if (result.navigations !== 1) return `expected 1 navigation entry, got ${result.navigations}`;
    for (const key of ["defaultMs", "catalogMs", "modeMs"]) {
      if (result[key] > 50) return `${key} took ${result[key].toFixed(1)}ms — not an in-frame update`;
    }
    return null;
  },
);

// --- 3. Reconnect lifecycle -------------------------------------------------
scenario(
  "reconnect",
  `(async () => {
    const provider = document.getElementById("p");
    const html = document.documentElement;
    const click = () => document.querySelector("themvora-toggle button").click();
    // The provider's bindings commit inside a View Transition when the browser
    // supports one, so the DOM settles a frame after the click, not within it.
    const settle = () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))));

    const first = html.getAttribute("data-theme");
    click();
    await settle();
    const afterFirstClick = html.getAttribute("data-theme");

    const parent = provider.parentNode;
    const anchor = provider.nextSibling;
    provider.remove();
    parent.insertBefore(provider, anchor);
    await settle();

    const beforeSecond = html.getAttribute("data-theme");
    click();
    await settle();
    const afterSecond = html.getAttribute("data-theme");

    // A second click must flip once more, not twice: a duplicated listener
    // would toggle back to the previous theme.
    const beforeThird = afterSecond;
    click();
    await settle();
    const afterThird = html.getAttribute("data-theme");

    return { first, afterFirstClick, beforeSecond, afterSecond, beforeThird, afterThird };
  })()`,
  (result) => {
    if (result.afterFirstClick === result.first) return "the first click did not toggle";
    if (result.beforeSecond !== result.afterFirstClick) return "the theme changed during the reconnect";
    if (result.afterSecond === result.beforeSecond) return "the toggle stopped working after a reconnect";
    if (result.afterThird === result.beforeThird) return "the toggle did not toggle again after a reconnect";
    return null;
  },
);

// --- 4 + 5. Fallbacks and diagnostics ---------------------------------------
scenario(
  "fallback-and-diagnostics",
  `(() => {
    const provider = document.getElementById("p");
    const html = document.documentElement;
    const scope = document.getElementById("scope");

    const captured = [];
    const originalError = console.error;
    const originalWarn = console.warn;
    const record = (args) => {
      const diagnostic = args[1];
      if (diagnostic && typeof diagnostic === "object" && diagnostic.code) captured.push(diagnostic.code);
    };
    console.error = (...args) => { record(args); originalError.apply(console, args); };
    console.warn = (...args) => { record(args); originalWarn.apply(console, args); };

    let neutral;
    let neutralError;
    try {
      // A valid JSON array with no themes: the catalog really is empty, which
      // is the documented neutral-fallback case (as opposed to a malformed
      // attribute, which is ignored).
      provider.setAttribute("themes", "[]");
      neutral = html.getAttribute("data-theme");
    } catch (error) {
      neutralError = String(error);
    }

    provider.setAttribute("themes", "light dark berry-light berry-dark");
    provider.setAttribute("default-theme", "light");
    scope.setAttribute("theme", "nord");
    const scopeTheme = scope.getAttribute("data-theme");
    const scopeBackground = scope.style.getPropertyValue("--theme-color-background");

    console.error = originalError;
    console.warn = originalWarn;

    return { neutral, neutralError, scopeTheme, scopeBackground, captured };
  })()`,
  (result) => {
    if (result.neutralError) return `setting an empty catalog threw: ${result.neutralError}`;
    if (result.neutral !== "light") return `neutral fallback resolved to ${result.neutral}`;
    if (result.scopeTheme !== "light") return `scope fell back to ${result.scopeTheme}, expected the catalog's first theme`;
    if (!result.scopeBackground) return "the scope rendered no variables after falling back";
    if (!result.captured.includes("TV_THEME_NEUTRAL_FALLBACK")) {
      return `missing TV_THEME_NEUTRAL_FALLBACK (saw ${result.captured.join(",") || "none"})`;
    }
    if (!result.captured.includes("TV_CONFIG_OPTION_INVALID")) {
      return `missing TV_CONFIG_OPTION_INVALID for the unknown scope theme (saw ${result.captured.join(",")})`;
    }
    return null;
  },
);

// --- 6. Cleanup -------------------------------------------------------------
scenario(
  "cleanup",
  `(async () => {
    const provider = document.getElementById("p");
    const scope = document.getElementById("scope");
    const html = document.documentElement;

    scope.setAttribute("theme", "berry-dark");
    const scopeBefore = scope.style.getPropertyValue("--theme-color-background");
    const scopeDataTheme = scope.getAttribute("data-theme");

    // Removing the attribute destroys the binding and restores the element's
    // own inline style — no scope variables may survive.
    scope.removeAttribute("theme");
    const scopeAfter = scope.style.getPropertyValue("--theme-color-background");
    const scopeDataAfter = scope.getAttribute("data-theme");

    // Removing the provider destroys its runtime. A fresh provider must then
    // build a new runtime rather than reuse the destroyed one.
    provider.remove();
    await new Promise((r) => setTimeout(r, 0));
    const replacement = document.createElement("themvora-provider");
    replacement.id = "p2";
    replacement.setAttribute("themes", "light dark berry-light berry-dark");
    replacement.setAttribute("default-theme", "berry-dark");
    document.body.appendChild(replacement);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

    return {
      scopeBefore,
      scopeDataTheme,
      scopeAfter,
      scopeDataAfter,
      replaced: html.getAttribute("data-theme"),
    };
  })()`,
  (result) => {
    if (!result.scopeBefore) return "the scope applied no variables before removal";
    if (result.scopeDataTheme !== "berry-dark") return `scope data-theme was ${result.scopeDataTheme}`;
    if (result.scopeAfter !== "") return `the scope kept its variables after removal: ${result.scopeAfter}`;
    if (result.scopeDataAfter !== null) return `the scope kept data-theme=${result.scopeDataAfter}`;
    if (result.replaced !== "berry-dark") return `a replacement provider resolved to ${result.replaced}`;
    return null;
  },
);

// --- Run --------------------------------------------------------------------
console.log("\n=== WEB COMPONENTS — BROWSER CHECK ===\n");

for (const { name, body, check } of scenarios) {
  consoleEntries = [];
  try {
    await load(`${origin}/?scenario=${name}`);
    const result = await evaluate(body);
    const problem = check(result);
    const unexpected = consoleEntries.filter((entry) => entry.type === "exception");
    const failure = problem ?? (unexpected.length ? `uncaught: ${unexpected[0].text}` : null);
    if (failure) {
      failures.push({ name, detail: failure, result });
      console.log(`  FAIL  ${name}`);
      console.log(`        ${failure}`);
    } else {
      console.log(`  ok    ${name}`);
    }
  } catch (error) {
    failures.push({ name, detail: String(error) });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${String(error)}`);
  }
}

console.log("");
if (failures.length) {
  console.log(`${failures.length} of ${scenarios.length} scenarios failed.\n`);
  for (const failure of failures) {
    console.log(`--- ${failure.name} ---`);
    console.log(failure.detail);
    if (failure.result) console.log(JSON.stringify(failure.result, null, 2));
    console.log("");
  }
  process.exitCode = 1;
} else {
  console.log(`All ${scenarios.length} scenarios passed in a real browser.\n`);
}

server.close();
try {
  process.kill(-browser.pid);
} catch {
  browser.kill();
}
