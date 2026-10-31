#!/usr/bin/env node
/**
 * Startup gate for the Remix example app (`examples/apps/remix`).
 *
 * Remix owns the document, so `app/root.tsx` authors the `<html>` element that
 * Themvora's pre-paint bootstrap rewrites. That makes the shell a *hand-written*
 * copy of a contract the library already implements — and both copies drifted:
 *
 *   - the example rendered a bare `<html lang="en">`, so React hydrated against
 *     seven attributes it had never rendered and logged
 *     "some attributes of the server rendered HTML didn't match the client
 *     properties" on **every** load, in development;
 *   - it never rendered `tv-scrollbar` and never passed `scrollbar` to
 *     `ThemeHead`, so the native scrollbar was painted first and replaced by the
 *     overlay after hydration — the flash this project already fixed for Astro.
 *
 * Neither is visible in a production build (React strips the message) and
 * neither is a type error, so nothing in the suite caught it. This gate runs the
 * **dev** server — the only place the warning exists — loads it in a real
 * browser, and asserts:
 *
 * | Assertion | Why it must hold |
 * | --------- | ---------------- |
 * | server HTML renders the theme shell | hydration parity; a bare `<html>` is the bug |
 * | server HTML renders `tv-scrollbar` + the hiding CSS | the native bar must never be painted |
 * | zero console errors on load | the hydration warning is a console error |
 * | zero uncaught exceptions | a broken bootstrap shows up here first |
 * | every arrow button holds an `<svg>`, not text | a markup string passed as a React icon renders as its own source |
 * | `system` + dark OS corrects without complaining | the one case the server *cannot* resolve, so it proves the suppression is load-bearing |
 *
 * ## No SKIP path
 *
 * A missing browser, a dev server that will not start, and a failed assertion
 * all exit non-zero with an actionable message. The gate that this one replaces
 * (there wasn't one) is why the defect shipped.
 *
 * Usage:
 *   node scripts/release/verify-remix-startup.mjs
 *   node scripts/release/verify-remix-startup.mjs --keep   # leave the server up
 *
 * Requires: headless Chromium (Playwright's, or `THEMVORA_CHROME`) and a
 * WebSocket client — `ws` when it is installed.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const appDir = join(repoRoot, "examples", "apps", "remix");
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
  console.error(`\n=== REMIX STARTUP GATE ===\n\n  FATAL — ${message}\n`);
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

// ---------------------------------------------------------------------------
// Toolchain discovery
// ---------------------------------------------------------------------------
function findChrome() {
  if (process.env.THEMVORA_CHROME && existsSync(process.env.THEMVORA_CHROME))
    return process.env.THEMVORA_CHROME;
  const pwRoot = join(
    process.env.LOCALAPPDATA ?? join(os.homedir(), "AppData", "Local"),
    "ms-playwright",
  );
  if (!existsSync(pwRoot)) return null;
  for (const d of readdirSync(pwRoot).filter((x) => /^chromium(-\d+)?$/.test(x))) {
    const exe = join(pwRoot, d, "chrome-win64", "chrome.exe");
    if (existsSync(exe)) return exe;
  }
  return null;
}

function findWs() {
  // `hoisted` first: this workspace uses `node-linker=hoisted`, so `ws` sits at
  // the root rather than under `.pnpm`.
  const hoisted = join(repoRoot, "node_modules", "ws");
  if (existsSync(join(hoisted, "package.json"))) return hoisted;
  const pnpm = join(repoRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpm)) return null;
  const dirs = readdirSync(pnpm).filter((d) => /^ws@\d+\.\d+\.\d+$/.test(d)).sort();
  for (const d of dirs.reverse()) {
    const p = join(pnpm, d, "node_modules", "ws", "package.json");
    if (existsSync(p)) return join(pnpm, d, "node_modules", "ws");
  }
  return null;
}

const chromePath = findChrome();
const wsPath = findWs();
if (!chromePath)
  fatal(
    "headless Chromium not found",
    "Install Playwright's Chromium, or point THEMVORA_CHROME at a chrome.exe.\n" +
      "      Do not silence this by skipping: the gate exists to observe a real load.",
  );
if (!wsPath)
  fatal(
    "the `ws` package is not installed",
    "The gate talks to Chromium over CDP, which needs a WebSocket client.",
  );

const remixCli = join(repoRoot, "node_modules", "@remix-run", "dev", "dist", "cli.js");
if (!existsSync(remixCli))
  fatal(
    `the Remix CLI is missing at ${remixCli}`,
    "Run `pnpm install` at the repository root.",
  );

const require = createRequire(import.meta.url);
const WebSocket = require(wsPath);

// ---------------------------------------------------------------------------
// Dev server
// ---------------------------------------------------------------------------
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
  [remixCli, "vite:dev", "--port", String(port), "--host", "127.0.0.1"],
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
    `the Remix dev server did not answer on ${base} within 120 s`,
    `\n--- dev server output ---\n${serverLog.join("")}`,
  );
}
const bootMs = Date.now() - started;

// ---------------------------------------------------------------------------
// Server HTML — what the browser is handed before any script runs
// ---------------------------------------------------------------------------
const serverHtml = await (await fetch(base)).text();
const htmlTag = serverHtml.match(/<html\b[^>]*>/)?.[0] ?? "";

let passed = 0;
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
  failures.push(`${label} — expected ${w}, got ${a}`);
};

const attr = (name) => {
  const m = htmlTag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};

console.log(`\n=== REMIX STARTUP GATE ===`);
console.log(`  dev server: ${base} (ready in ${bootMs} ms)\n`);

expect("server HTML: data-theme is rendered", attr("data-theme") !== null, true);
expect(
  "server HTML: data-theme-mode is rendered",
  attr("data-theme-mode") !== null,
  true,
);
expect(
  "server HTML: data-theme-selection-mode is rendered",
  attr("data-theme-selection-mode") !== null,
  true,
);
expect(
  "server HTML: data-theme-ready is rendered",
  attr("data-theme-ready"),
  "true",
);
expect(
  "server HTML: the theme CSS variables are inline",
  /--theme-color-background:/.test(attr("style") ?? ""),
  true,
);
expect(
  "server HTML: the document declares tv-scrollbar",
  /\btv-scrollbar\b/.test(attr("class") ?? ""),
  true,
);
// The class scopes the CSS; this `<style>` is what actually hides the native
// bar. Both have to be in the server HTML, or the bar is painted and replaced.
expect(
  "server HTML: the native scrollbar is hidden pre-paint",
  serverHtml.includes('data-themvora-pre-paint="scrollbar"'),
  true,
);

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------
const profile = mkdtempSync(join(os.tmpdir(), "tv-remix-gate-"));
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
teardown.push(async () => {
  browser.kill();
});

const portFile = join(profile, "DevToolsActivePort");
for (let i = 0; i < 80; i++) {
  if (existsSync(portFile)) break;
  await new Promise((r) => setTimeout(r, 250));
}
if (!existsSync(portFile)) {
  await shutdown();
  fatal(
    "headless Chromium did not expose a CDP endpoint",
    "The browser launched but never wrote DevToolsActivePort. A stale profile lock or a blocked port is the usual cause.",
  );
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
    const m = JSON.parse(raw);
    if (m.id && pending.has(m.id)) {
      const { resolve: res, reject: rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
    for (const l of listeners) l(m);
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
  ws.on("open", () => resolve({ send, on: (h) => listeners.add(h), close: () => ws.close() }));
  ws.on("error", reject);
});
teardown.push(async () => cdp.close());

/**
 * Loads the app once and returns what the page reported about itself.
 *
 * @param options - Cookies to set before navigating, and whether the OS prefers
 *   a dark colour scheme.
 * @returns The console errors, uncaught exceptions, and the settled `<html>`
 *   state.
 */
async function load({ cookies = {}, prefersDark = false } = {}) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const send = (m, p) => cdp.send(m, p, sessionId);

  const consoleErrors = [];
  const exceptions = [];
  cdp.on((m) => {
    if (m.method === "Runtime.consoleAPICalled") {
      const { type, args } = m.params;
      if (type !== "error" && type !== "warning" && type !== "assert") return;
      const text = args
        .map((a) => a.value ?? a.description ?? "")
        .join(" ")
        .slice(0, 600);
      if (text) consoleErrors.push(`[${type}] ${text}`);
    } else if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      exceptions.push(String(d.exception?.description ?? d.text).slice(0, 600));
    }
  });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  for (const [name, value] of Object.entries(cookies)) {
    await send("Network.setCookie", {
      name,
      value,
      domain: "127.0.0.1",
      path: "/",
    });
  }
  if (prefersDark) {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: "dark" }],
    });
  }

  await send("Page.navigate", { url: base });
  // The bootstrap is synchronous and runs before first paint; a fixed settle is
  // enough to let hydration finish and React report anything it disliked.
  await new Promise((r) => setTimeout(r, 4000));

  const evaluated = await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.documentElement;
      const attrs = {};
      for (const a of el.attributes) attrs[a.name] = a.value;
      return JSON.stringify({
        attrs,
        ready: attrs["data-theme-ready"] ?? null,
        className: attrs.class ?? "",
        colorScheme: el.style.colorScheme || null,
        background: getComputedStyle(document.body).backgroundColor,
        text: (document.body?.innerText ?? "").slice(0, 80),
        arrows: [...document.querySelectorAll(".tv-arrow")].map((a) => ({
          label: a.getAttribute("aria-label"),
          svgs: a.querySelectorAll("svg").length,
          text: (a.textContent || "").trim().slice(0, 40),
        })),
      });
    })()`,
    returnByValue: true,
  });

  await send("Target.closeTarget", { targetId });
  return {
    consoleErrors,
    exceptions,
    ...JSON.parse(evaluated.result.value),
  };
}

// --- scenario 1: a cold first visit -----------------------------------------
const cold = await load();
expect("cold load: no console errors or warnings", cold.consoleErrors, []);
expect("cold load: no uncaught exceptions", cold.exceptions, []);
expect("cold load: the bootstrap completed", cold.ready, "true");
expect(
  "cold load: the theme attributes survived hydration",
  cold.attrs["data-theme"] ?? null,
  attr("data-theme"),
);
expect(
  "cold load: the scrollbar class survived hydration",
  /\btv-scrollbar\b/.test(cold.className),
  true,
);
expect(
  "cold load: the overlay engine took over",
  /\btv-scrollbar-ready\b/.test(cold.className),
  true,
);
expect("cold load: the CSS variables are applied", cold.colorScheme !== null, true);
expect("cold load: the canvas is painted", cold.background !== "rgba(0, 0, 0, 0)", true);

// The overlay's arrow buttons must contain a rendered glyph, not the glyph's
// source. `@themvora/app-shared/icons` exports SVG *markup strings* for the
// adapters that inject markup; passing one to a React `ThemeScrollbar` makes it
// a text node, so the button shows the literal `<svg …>` — which at an 8 px
// glyph size reads as a stray character. React apps have to pass JSX.
expect(
  "cold load: the overlay rendered arrow buttons",
  cold.arrows.length >= 4,
  true,
);
expect(
  "cold load: every arrow button contains an svg glyph",
  cold.arrows.filter((a) => a.svgs !== 1).map((a) => `${a.label}: ${a.svgs}`),
  [],
);
expect(
  "cold load: no arrow button renders markup as text",
  cold.arrows.filter((a) => a.text !== "").map((a) => `${a.label}: ${a.text}`),
  [],
);

// --- scenario 2: a `system` selection on a dark OS ---------------------------
//
// The server cannot evaluate `prefers-color-scheme`, so it renders `light` and
// the script corrects it to `dark` before paint. That is a *legitimate*
// attribute difference — the case `suppressHydrationWarning` exists for. If the
// suppression were removed, this is the load that would print the warning.
const systemDark = await load({
  cookies: { "theme-mode": "system", "theme-family": "themvora" },
  prefersDark: true,
});
expect("system+dark: no console errors or warnings", systemDark.consoleErrors, []);
expect("system+dark: no uncaught exceptions", systemDark.exceptions, []);
expect(
  "system+dark: the selection stays system",
  systemDark.attrs["data-theme-selection-mode"] ?? null,
  "system",
);
expect(
  "system+dark: the resolved mode follows the OS",
  systemDark.attrs["data-theme-mode"] ?? null,
  "dark",
);
expect(
  "system+dark: the canvas is the dark theme",
  systemDark.attrs["data-theme"] ?? null,
  cold.attrs["data-theme"]?.includes("dark")
    ? cold.attrs["data-theme"]
    : String(cold.attrs["data-theme"]).replace("-light", "-dark"),
);

// The server HTML for this request must still say `light` — otherwise the
// scenario did not exercise the mismatch at all and proves nothing.
const systemServerHtml = await (
  await fetch(base, { headers: { Cookie: "theme-mode=system; theme-family=themvora" } })
).text();
const systemServerMode = /data-theme-mode="([^"]*)"/.exec(systemServerHtml)?.[1] ?? null;
expect(
  "system+dark: the server rendered the light guess",
  systemServerMode,
  "light",
);

await shutdown();

console.log(
  `\n  ${failures.length === 0 ? "PASS" : "FAIL"}  remix startup: ${passed} assertions, ${failures.length} failed\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
