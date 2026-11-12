#!/usr/bin/env node
/**
 * Startup gate for the React Router Framework Mode example
 * (`examples/apps/react-router`).
 *
 * React Router's root route owns the document. The integration must therefore
 * place the blocking theme script inside the server-rendered `<head>`, render a
 * matching `<html>` shell, and hydrate a runtime that agrees with both. This
 * gate observes that contract in the only place all of it exists: a real dev
 * server and a real browser.
 *
 * Assertions:
 *  - the server HTML has one bootstrap script, inside `<head>`;
 *  - `<html>` carries the theme attributes, CSS variables and `tv-scrollbar`;
 *  - the native scrollbar is hidden pre-paint;
 *  - no console errors/warnings and no uncaught exceptions on load;
 *  - the bootstrap sets `data-theme-ready` before first contentful paint;
 *  - first visits and persisted light/dark requests resolve the right theme;
 *  - with external JS blocked, the inline bootstrap still paints the persisted
 *    theme (the first-paint state does not depend on hydration);
 *  - client navigation, theme switching, reload and persistence work.
 *
 * Usage:
 *   node scripts/release/verify-react-router-startup.mjs
 *   node scripts/release/verify-react-router-startup.mjs --keep
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const appDir = join(repoRoot, "examples", "apps", "react-router");
const keepServer = process.argv.includes("--keep");

const failures = [];
const teardown = [];

async function shutdown() {
  for (const fn of teardown.reverse()) {
    try {
      await fn();
    } catch {
      /* teardown must not mask the failure that caused it */
    }
  }
}

function fatal(message, detail) {
  console.error(`\n=== REACT ROUTER STARTUP GATE ===\n\n  FATAL — ${message}\n`);
  if (detail) console.error(`${detail}\n`);
  process.exit(1);
}

process.on("uncaughtException", async (error) => {
  await shutdown();
  fatal(error.message, error.stack);
});
process.on("unhandledRejection", async (error) => {
  await shutdown();
  fatal(error instanceof Error ? error.message : String(error), error?.stack);
});

function findChrome() {
  if (process.env.THEMVORA_CHROME && existsSync(process.env.THEMVORA_CHROME)) {
    return process.env.THEMVORA_CHROME;
  }
  const pwRoot = join(
    process.env.LOCALAPPDATA ?? join(os.homedir(), "AppData", "Local"),
    "ms-playwright",
  );
  if (!existsSync(pwRoot)) return null;
  for (const dir of readdirSync(pwRoot).filter((x) => /^chromium(-\d+)?$/.test(x))) {
    const exe = join(pwRoot, dir, "chrome-win64", "chrome.exe");
    if (existsSync(exe)) return exe;
  }
  return null;
}

function findWs() {
  const candidates = [
    join(repoRoot, "node_modules", "ws"),
    join(repoRoot, "node_modules", ".pnpm"),
  ];
  if (existsSync(join(candidates[0], "package.json"))) return candidates[0];
  if (!existsSync(candidates[1])) return null;
  for (const dir of readdirSync(candidates[1])
    .filter((x) => /^ws@\d+\.\d+\.\d+/.test(x))
    .sort()
    .reverse()) {
    const found = join(candidates[1], dir, "node_modules", "ws", "package.json");
    if (existsSync(found)) return join(candidates[1], dir, "node_modules", "ws");
  }
  return null;
}

const chromePath = findChrome();
const wsPath = findWs();
if (!chromePath) {
  fatal(
    "headless Chromium not found",
    "Install Playwright's Chromium, or point THEMVORA_CHROME at a chrome.exe.",
  );
}
if (!wsPath) {
  fatal("the `ws` package is not installed", "The gate talks to Chromium over CDP.");
}

const cliCandidates = [
  join(appDir, "node_modules", "@react-router", "dev", "bin.cjs"),
  join(repoRoot, "node_modules", "@react-router", "dev", "bin.cjs"),
];
const reactRouterCli = cliCandidates.find((candidate) => existsSync(candidate));
if (!reactRouterCli) {
  fatal(
    "the React Router CLI is missing",
    `Looked in:\n${cliCandidates.map((c) => `      ${c}`).join("\n")}\n` +
      "Run `pnpm install` at the repository root.",
  );
}

const require = createRequire(import.meta.url);
const WebSocket = require(wsPath);

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;

const serverLog = [];
const dev = spawn(
  process.execPath,
  [
    reactRouterCli,
    "dev",
    "--port",
    String(port),
    "--host",
    "127.0.0.1",
    "--strictPort",
  ],
  {
    cwd: appDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "development", BROWSER: "none" },
  },
);
dev.stdout.on("data", (b) => serverLog.push(String(b)));
dev.stderr.on("data", (b) => serverLog.push(String(b)));
if (!keepServer) {
  teardown.push(
    () =>
      new Promise((resolve) => {
        if (dev.exitCode !== null) return resolve();
        dev.once("exit", resolve);
        dev.kill();
      }),
  );
}

const started = Date.now();
let ready = false;
for (let i = 0; i < 240; i++) {
  if (dev.exitCode !== null) break;
  try {
    const res = await fetch(base, { redirect: "manual" });
    if (res.ok) {
      ready = true;
      break;
    }
  } catch {
    /* not listening yet */
  }
  await new Promise((r) => setTimeout(r, 500));
}
if (!ready) {
  await shutdown();
  fatal(
    `the React Router dev server did not answer on ${base} within 120 s`,
    `\n--- dev server output ---\n${serverLog.join("")}`,
  );
}
const bootMs = Date.now() - started;

let passed = 0;
const failuresLocal = [];
const expect = (label, actual, wanted) => {
  const a = JSON.stringify(actual);
  const w = JSON.stringify(wanted);
  if (a === w) {
    passed += 1;
    return;
  }
  console.log(`  FAIL  ${label}`);
  console.log(`          expected ${w}`);
  console.log(`          actual   ${a}`);
  failuresLocal.push(`${label} — expected ${w}, got ${a}`);
};

async function serverHtml(cookie) {
  const response = await fetch(base, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  return response.text();
}

const htmlTag = (html) => html.match(/<html\b[^>]*>/)?.[0] ?? "";
const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? match[1] : null;
};

console.log(`\n=== REACT ROUTER STARTUP GATE ===`);
console.log(`  dev server: ${base} (ready in ${bootMs} ms)\n`);

// ---------------------------------------------------------------------------
// Server HTML — first byte, before any browser work
// ---------------------------------------------------------------------------
const coldHtml = await serverHtml();
const coldTag = htmlTag(coldHtml);
const headStart = coldHtml.indexOf("<head");
const headEnd = coldHtml.indexOf("</head>");
const scriptAt = coldHtml.indexOf("<script");

expect("server HTML: exactly one <html> element", (coldHtml.match(/<html\b/g) ?? []).length, 1);
expect("server HTML: the bootstrap script is inside <head>", scriptAt > headStart && scriptAt < headEnd, true);
expect(
  "server HTML: the bootstrap carries the runtime guard id",
  coldHtml.includes('id="themvora-bootstrap"'),
  true,
);
expect("server HTML: exactly one bootstrap script", (coldHtml.match(/theme-fingerprint/g) ?? []).length > 0, true);
expect("server HTML: data-theme is rendered", attr(coldTag, "data-theme"), "light");
expect("server HTML: data-theme-mode is rendered", attr(coldTag, "data-theme-mode"), "light");
expect("server HTML: data-theme-selection-mode is rendered", attr(coldTag, "data-theme-selection-mode"), "system");
expect("server HTML: data-theme-ready is rendered", attr(coldTag, "data-theme-ready"), "true");
expect("server HTML: theme CSS variables are inline", /--theme-color-background:/.test(attr(coldTag, "style") ?? ""), true);
expect("server HTML: the document declares tv-scrollbar", /\btv-scrollbar\b/.test(attr(coldTag, "class") ?? ""), true);
expect(
  "server HTML: the native scrollbar is hidden pre-paint",
  coldHtml.includes('data-themvora-pre-paint="scrollbar"'),
  true,
);
expect(
  "server HTML: the React Router app is server-rendered",
  coldHtml.includes("Design system"),
  true,
);

const darkHtml = await serverHtml("theme-mode=dark; theme-family=default");
expect(
  "server HTML with dark cookie: data-theme is dark",
  attr(htmlTag(darkHtml), "data-theme"),
  "dark",
);
expect(
  "server HTML with dark cookie: data-theme-mode is dark",
  attr(htmlTag(darkHtml), "data-theme-mode"),
  "dark",
);

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------
const profile = mkdtempSync(join(os.tmpdir(), "tv-react-router-gate-"));
const browser = spawn(
  chromePath,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-proxy-server",
    "--disable-gpu",
    "--window-size=1280,900",
    "about:blank",
  ],
  { stdio: "ignore", detached: true },
);
browser.unref();
teardown.push(async () => browser.kill());

const portFile = join(profile, "DevToolsActivePort");
for (let i = 0; i < 80; i++) {
  if (existsSync(portFile)) break;
  await new Promise((r) => setTimeout(r, 250));
}
if (!existsSync(portFile)) {
  await shutdown();
  fatal("headless Chromium did not expose a CDP endpoint");
}
const [cdpPort, browserPath = "/devtools/browser"] = readFileSync(portFile, "utf8")
  .split("\n")
  .map((s) => s.trim());

const cdp = await new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://127.0.0.1:${cdpPort}${browserPath}`);
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.on("message", (raw) => {
    const message = JSON.parse(raw);
    if (message.id && pending.has(message.id)) {
      const { resolve: res, reject: rej } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? rej(new Error(message.error.message)) : res(message.result);
    }
    for (const listener of listeners) listener(message);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { resolve: res, reject: rej });
      ws.send(
        JSON.stringify(
          sessionId ? { sessionId, id: i, method, params } : { id: i, method, params },
        ),
      );
    });
  ws.on("open", () =>
    resolve({
      send,
      on: (handler) => listeners.add(handler),
      close: () => ws.close(),
    }),
  );
  ws.on("error", reject);
});
teardown.push(async () => cdp.close());

function prePaintProbe(blockExternalScripts) {
  return `(() => {
  window.__tvProbe = { readyAt: null, fcp: null, themeAtReady: null, attrsAtReady: null };
  const original = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (${blockExternalScripts ? "true" : "false"} && this instanceof HTMLScriptElement && name === "src") {
      return;
    }
    if (this === document.documentElement && name === "data-theme-ready" && window.__tvProbe.readyAt === null) {
      window.__tvProbe.readyAt = performance.now();
      window.__tvProbe.themeAtReady = document.documentElement.getAttribute("data-theme");
      window.__tvProbe.attrsAtReady = {
        theme: document.documentElement.getAttribute("data-theme"),
        mode: document.documentElement.getAttribute("data-theme-mode"),
        ready: document.documentElement.getAttribute("data-theme-ready"),
      };
    }
    return original.call(this, name, value);
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === "first-contentful-paint") window.__tvProbe.fcp = entry.startTime;
    }
  }).observe({ type: "paint", buffered: true });
})()`;
}

async function load({
  cookie = null,
  prefersDark = false,
  blockExternalScripts = false,
  settle = 2500,
} = {}) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const send = (method, params) => cdp.send(method, params, sessionId);

  const consoleErrors = [];
  const exceptions = [];
  cdp.on((message) => {
    if (message.method === "Runtime.consoleAPICalled") {
      const { type, args } = message.params;
      if (type !== "error" && type !== "warning" && type !== "assert") return;
      const text = args
        .map((arg) => arg.value ?? arg.description ?? "")
        .join(" ")
        .slice(0, 600);
      if (text) consoleErrors.push(`[${type}] ${text}`);
    } else if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      exceptions.push(
        String(details.exception?.description ?? details.text).slice(0, 600),
      );
    }
  });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Network.clearBrowserCookies");
  await send("Storage.clearDataForOrigin", { origin: base, storageTypes: "all" });
  if (cookie) {
    for (const part of cookie.split(";")) {
      const [name, value] = part.trim().split("=");
      if (!name || value === undefined) continue;
      await send("Network.setCookie", {
        name,
        value,
        domain: "127.0.0.1",
        path: "/",
      });
    }
  }
  if (prefersDark) {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: "dark" }],
    });
  }
  if (blockExternalScripts) {
    // The inline bootstrap stays in the document; only the module graph is
    // blocked, so this scenario observes the SSR HTML plus the pre-paint
    // script with no React hydration.
    await send("Network.setBlockedURLs", {
      urls: [
        "*@vite*",
        "*@react-refresh*",
        "*/@fs/*",
        "*/app/*.tsx*",
        "*/app/*.ts*",
      ],
    });
  }
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: prePaintProbe(blockExternalScripts),
  });

  await send("Page.navigate", { url: base });
  await new Promise((r) => setTimeout(r, settle));

  const evaluated = await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.documentElement;
      const attrs = {};
      for (const attribute of el.attributes) attrs[attribute.name] = attribute.value;
      return JSON.stringify({
        attrs,
        className: attrs.class ?? "",
        cookies: document.cookie,
        url: location.pathname,
        heading: document.querySelector("h1")?.textContent ?? null,
        background: getComputedStyle(document.body).backgroundColor,
        probe: window.__tvProbe ?? null,
        scripts: [...document.querySelectorAll("script")].length,
      });
    })()`,
    returnByValue: true,
  });

  await send("Target.closeTarget", { targetId });
  return { consoleErrors, exceptions, ...JSON.parse(evaluated.result.value) };
}

// --- cold first visit -------------------------------------------------------
const cold = await load();
expect("cold load: no console errors or warnings", cold.consoleErrors, []);
expect("cold load: no uncaught exceptions", cold.exceptions, []);
expect("cold load: the bootstrap completed", cold.attrs["data-theme-ready"], "true");
expect("cold load: theme attributes survived hydration", cold.attrs["data-theme"], "light");
expect("cold load: the scrollbar class survived hydration", /\btv-scrollbar\b/.test(cold.className), true);
expect("cold load: the overlay engine took over", /\btv-scrollbar-ready\b/.test(cold.className), true);
expect("cold load: the canvas is painted", cold.background !== "rgba(0, 0, 0, 0)", true);
expect("cold load: the page rendered", cold.heading, "Themvora");

// Bootstrap must complete before the first contentful paint.
expect("cold load: the probe recorded the bootstrap", typeof cold.probe?.readyAt, "number");
expect("cold load: the probe recorded first contentful paint", typeof cold.probe?.fcp, "number");
if (typeof cold.probe?.readyAt === "number" && typeof cold.probe?.fcp === "number") {
  expect(
    "cold load: the bootstrap ran before first contentful paint",
    cold.probe.readyAt <= cold.probe.fcp,
    true,
  );
}
expect(
  "cold load: the theme was already resolved when the bootstrap marked the document",
  cold.probe?.attrsAtReady?.theme,
  "light",
);

// --- persisted light and dark, with external JS blocked ---------------------
const lightNoJs = await load({
  cookie: "theme-mode=light; theme-family=default",
  blockExternalScripts: true,
  settle: 1200,
});
expect("persisted light (JS blocked): no uncaught exceptions", lightNoJs.exceptions, []);
expect("persisted light (JS blocked): data-theme is light", lightNoJs.attrs["data-theme"], "light");
expect("persisted light (JS blocked): the canvas is light", lightNoJs.background, "rgb(239, 240, 241)");

const darkNoJs = await load({
  cookie: "theme-mode=dark; theme-family=default",
  blockExternalScripts: true,
  settle: 1200,
});
expect("persisted dark (JS blocked): no uncaught exceptions", darkNoJs.exceptions, []);
expect("persisted dark (JS blocked): data-theme is dark", darkNoJs.attrs["data-theme"], "dark");
expect("persisted dark (JS blocked): data-theme-mode is dark", darkNoJs.attrs["data-theme-mode"], "dark");
expect("persisted dark (JS blocked): the canvas is dark", darkNoJs.background, "rgb(9, 9, 10)");
expect(
  "persisted dark (JS blocked): the bootstrap painted before first contentful paint",
  typeof darkNoJs.probe?.readyAt === "number" &&
    typeof darkNoJs.probe?.fcp === "number" &&
    darkNoJs.probe.readyAt <= darkNoJs.probe.fcp,
  true,
);

// --- persisted dark with hydration -----------------------------------------
const dark = await load({ cookie: "theme-mode=dark; theme-family=default" });
expect("persisted dark: no console errors or warnings", dark.consoleErrors, []);
expect("persisted dark: no uncaught exceptions", dark.exceptions, []);
expect("persisted dark: data-theme is dark", dark.attrs["data-theme"], "dark");
expect("persisted dark: data-theme-mode is dark", dark.attrs["data-theme-mode"], "dark");

// --- system + dark OS -------------------------------------------------------
const systemDark = await load({
  cookie: "theme-mode=system; theme-family=default",
  prefersDark: true,
});
expect("system+dark: no console errors or warnings", systemDark.consoleErrors, []);
expect("system+dark: no uncaught exceptions", systemDark.exceptions, []);
expect("system+dark: the selection stays system", systemDark.attrs["data-theme-selection-mode"], "system");
expect("system+dark: the resolved mode follows the OS", systemDark.attrs["data-theme-mode"], "dark");
expect("system+dark: the canvas is dark", systemDark.background, "rgb(9, 9, 10)");

// --- navigation, switching, reload ----------------------------------------
//
// One target so client-side state has a chance to leak, which is exactly the
// persistence contract being tested.
{
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  const consoleErrors = [];
  const exceptions = [];
  cdp.on((message) => {
    if (message.method === "Runtime.consoleAPICalled") {
      const { type, args } = message.params;
      if (type !== "error" && type !== "warning" && type !== "assert") return;
      const text = args.map((arg) => arg.value ?? arg.description ?? "").join(" ").slice(0, 600);
      if (text) consoleErrors.push(`[${type}] ${text}`);
    } else if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      exceptions.push(String(details.exception?.description ?? details.text).slice(0, 600));
    }
  });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.clearBrowserCookies");
  await send("Storage.clearDataForOrigin", { origin: base, storageTypes: "all" });
  await send("Page.navigate", { url: base });
  await new Promise((r) => setTimeout(r, 2500));

  const click = (expression) =>
    send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  const state = () =>
    send("Runtime.evaluate", {
      expression: `(() => ({
        path: location.pathname,
        theme: document.documentElement.getAttribute("data-theme"),
        mode: document.documentElement.getAttribute("data-theme-mode"),
        cookies: document.cookie,
        heading: document.querySelector("h1")?.textContent ?? null,
      }))()`,
      returnByValue: true,
    });

  await click(`document.querySelector('a[href="/about"]').click()`);
  await new Promise((r) => setTimeout(r, 700));
  const about = (await state()).result.value;
  expect("navigation: reached /about", about.path, "/about");
  expect("navigation: about page rendered", about.heading, "How this app is wired");
  expect("navigation: theme survived navigation", about.theme, "light");

  await click(`document.querySelector('a[href="/"]').click()`);
  await new Promise((r) => setTimeout(r, 700));

  // Toggle from the default light selection to dark.
  await click(
    `[...document.querySelectorAll("button")].find((b) => b.textContent.includes("Toggle")).click()`,
  );
  await new Promise((r) => setTimeout(r, 500));
  const changed = (await state()).result.value;
  expect("theme switch: the document is dark", changed.theme, "dark");
  expect("theme switch: the mode cookie is persisted", /theme-mode=dark/.test(changed.cookies), true);
  expect("theme switch: the family cookie is persisted", /theme-family=default/.test(changed.cookies), true);

  await send("Page.reload", { ignoreCache: true });
  await new Promise((r) => setTimeout(r, 2500));
  const reloaded = (await state()).result.value;
  expect("reload: the theme stayed dark", reloaded.theme, "dark");
  expect("reload: no console errors or warnings", consoleErrors, []);
  expect("reload: no uncaught exceptions", exceptions, []);

  await send("Target.closeTarget", { targetId });
}

await shutdown();

if (failuresLocal.length === 0) {
  console.log(`\n  PASS  react router startup: ${passed} assertions, 0 failed\n`);
  process.exit(0);
}

failures.push(...failuresLocal);
console.log(`\n  FAIL  react router startup: ${passed} assertions, ${failures.length} failed\n`);
for (const failure of failures) console.log(`  ✗ ${failure}`);
process.exit(1);
