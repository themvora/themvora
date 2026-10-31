#!/usr/bin/env node
/**
 * Real consumer test for the documented Web Components setup.
 *
 * Every other check in this repo starts from the monorepo: workspace links,
 * a pre-built `dist`, packages that resolve through `pnpm`. A reader does none
 * of that. They scaffold a Vite project, run the install command the docs
 * print, and paste the snippets the guide shows. This script does exactly that,
 * in a throwaway directory outside the workspace:
 *
 *   1. `npm create vite@latest … --template vanilla-ts`   (the documented start)
 *   2. `npm install`                                       (the template's deps)
 *   3. `npm install @themvora/core @themvora/web`           — from the *packed
 *      tarballs*, so the test exercises what `npm publish` would ship, not the
 *      source tree.
 *   4. Write the snippet files, stage by stage, exactly as the guide presents
 *      them, and rebuild after each stage.
 *   5. Load each build in a real browser and assert the result.
 *
 * The snippets are read from `apps/docs/lib/frameworks.tsx` rather than copied
 * here: a copy would pass while the docs were wrong, which is the one failure
 * this script exists to catch.
 *
 * Usage:
 *   node examples/apps/web/scripts/consumer-check.mjs [--keep]
 *
 * `--keep` leaves the scaffolded project in place and prints its path.
 *
 * Requires: network (for the Vite scaffold and its dependencies), a Chromium
 * (Playwright's or Chrome/Edge), and fresh tarballs — run
 * `node scripts/release/pack-verify.mjs` first.
 */

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const repoRoot = resolve(here, "..", "..", "..", "..");
const keep = process.argv.includes("--keep");

const { readWebSnippets } = await import(
  pathToFileURL(join(repoRoot, "apps", "docs", "scripts", "lib", "frameworks-snippets.mjs")).href
);

// --- Reporting --------------------------------------------------------------

const results = [];
let currentStage = "";

function stage(name) {
  currentStage = name;
  console.log(`\n--- ${name} ---`);
}

function check(label, ok, detail) {
  results.push({ stage: currentStage, label, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` — ${detail}`}`);
}

// --- Shell ------------------------------------------------------------------

/**
 * Runs a command and inherits stdio.
 *
 * `stdio: "pipe"` is unusable on this host (EBUSY), and `execSync` with
 * `encoding` fails silently, so the exit status is the only signal that works.
 */
function run(command, cwd) {
  console.log(`  $ ${command}`);
  const result = spawnSync(command, { cwd, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    throw new Error(`command failed (${result.status ?? result.signal}): ${command}`);
  }
}

// --- The scaffold -----------------------------------------------------------

const snippets = readWebSnippets(repoRoot);
const pkgVersions = {
  core: JSON.parse(readFileSync(join(repoRoot, "packages", "core", "package.json"), "utf8")).version,
  web: JSON.parse(readFileSync(join(repoRoot, "packages", "web", "package.json"), "utf8")).version,
};
const tarballs = {
  core: join(repoRoot, "release-test", "tarballs", `themvora-core-${pkgVersions.core}.tgz`),
  web: join(repoRoot, "release-test", "tarballs", `themvora-web-${pkgVersions.web}.tgz`),
};

for (const [name, path] of Object.entries(tarballs)) {
  if (!existsSync(path)) {
    console.error(
      `Missing ${name} tarball: ${path}\n` +
        "Run `node scripts/release/pack-verify.mjs` first — this test installs what npm would publish.",
    );
    process.exit(1);
  }
}

const scratch = mkdtempSync(join(os.tmpdir(), "themvora-consumer-"));
const projectName = "consumer";
const project = join(scratch, projectName);

console.log(`\n=== WEB COMPONENTS — CONSUMER CHECK ===\n`);
console.log(`Scratch: ${scratch}`);

// 1. The documented start: a fresh Vite vanilla-ts project.
run(`npm create vite@latest ${projectName} -- --template vanilla-ts`, scratch);

// 2. The template's own dependencies.
run("npm install --no-audit --no-fund", project);

// 3. The documented install command, against the published artifacts.
run(`npm install --no-audit --no-fund "${tarballs.core}" "${tarballs.web}"`, project);

// The install must be the published package, not a link back into the repo.
const installed = JSON.parse(
  readFileSync(join(project, "node_modules", "@themvora", "web", "package.json"), "utf8"),
);
check(
  "installed @themvora/web from the packed tarball",
  installed.version === pkgVersions.web,
  `got ${installed.version}, expected ${pkgVersions.web}`,
);
check(
  "the tarball ships the editor metadata",
  existsSync(join(project, "node_modules", "@themvora", "web", "html-data.json")),
);
check(
  "the tarball ships built declarations",
  existsSync(join(project, "node_modules", "@themvora", "web", "dist", "index.d.ts")),
);

// --- File writers -----------------------------------------------------------

function write(relative, contents) {
  const target = join(project, relative);
  // The reader creates `scripts/` before writing into it; so do we.
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function stageFiles(files) {
  for (const [relative, contents] of Object.entries(files)) write(relative, contents);
}

/** `npm run build` is `tsc && vite build` in the template. */
function build(label) {
  console.log(`  building (${label})…`);
  run("npm run build", project);
}

// --- Browser ----------------------------------------------------------------

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
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]) {
    if (existsSync(exe)) return exe;
  }
  return null;
}

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
if (!chrome) {
  console.error("No Chrome/Chromium found. Set THEMVORA_CHROME.");
  process.exit(1);
}
if (!wsPath) {
  console.error("The `ws` package is not installed (needed for the CDP transport).");
  process.exit(1);
}

const { default: WebSocket } = await import(`file://${wsPath.replaceAll("\\", "/")}/index.js`);

// Serve the built output. Reading from disk per request keeps a rebuild visible
// without restarting the server.
const distRoot = join(project, "dist");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
};
const server = createServer((req, res) => {
  const url = (req.url ?? "/").split("?")[0];
  const path = join(distRoot, url === "/" ? "index.html" : url);
  if (!existsSync(path)) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const profileDir = join(os.tmpdir(), `tv-consumer-profile-${process.pid}`);
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
for (let i = 0; i < 80 && !existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 250));
if (!existsSync(portFile)) {
  console.error("The browser did not expose a CDP endpoint.");
  process.exit(1);
}

const [cdpPort, browserPath = "/devtools/browser"] = readFileSync(portFile, "utf8")
  .split("\n")
  .map((s) => s.trim());

function connect(port, path) {
  return new Promise((resolveConnection, reject) => {
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
      resolveConnection({
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

const cdp = await connect(Number(cdpPort), browserPath);
const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
const send = (method, params) => cdp.send(method, params, sessionId);

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });

let consoleEntries = [];
cdp.on((message) => {
  if (message.method === "Runtime.consoleAPICalled") {
    const { type, args } = message.params;
    if (type !== "error" && type !== "warning") return;
    consoleEntries.push({
      type,
      text: args.map((a) => a.value ?? a.description ?? "").join(" "),
    });
  }
  if (message.method === "Runtime.exceptionThrown") {
    consoleEntries.push({
      type: "exception",
      text: message.params.exceptionDetails?.exception?.description ?? "uncaught exception",
    });
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
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text ?? "evaluation failed");
  }
  return result.value;
}

/** Clears persistence, loads the page, waits for the elements to upgrade. */
async function load({ blockScripts = false } = {}) {
  await send("Storage.clearDataForOrigin", {
    origin,
    storageTypes: "local_storage,session_storage",
  });
  await send("Network.setBlockedURLs", { urls: blockScripts ? ["*/assets/*.js"] : [] });
  consoleEntries = [];
  const loaded = new Promise((resolveLoad) => {
    cdp.on((message) => {
      if (message.method === "Page.loadEventFired") resolveLoad();
    });
  });
  await send("Page.navigate", { url: origin });
  await loaded;
  await evaluate(`new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)))`);
}

/** Console errors that are not the library's own reported diagnostics. */
function unexpectedConsole() {
  return consoleEntries.filter(
    (entry) => entry.type === "exception" || !entry.text.includes("[themvora]"),
  );
}

function noUnexpectedConsole(label = "no unexpected console errors") {
  const bad = unexpectedConsole();
  check(label, bad.length === 0, bad.map((e) => e.text).join(" | ").slice(0, 400));
}

// --- Stage 1: the guide's step 2 -------------------------------------------
// `index.html` + `src/main.ts`, with the template's `src/style.css` replaced by
// the documented stylesheet. This is the first point a reader expects to see a
// theme, so every assertion here is about "did the install actually work".

stage("step 2 — set up (index.html + src/main.ts)");
stageFiles({
  "index.html": snippets.noTheme.code,
  "src/main.ts": snippets.setupExtra.code,
  "src/style.css": snippets.styles,
});
build("step 2");
await load();

// Render-blocking CSS is the structural half of "no flash". A stylesheet
// imported from `main.ts` is injected by the module graph, so the first paint
// has no rules and the page flashes raw HTML; a `<link>` in `<head>` does not.
const builtHtml = readFileSync(join(project, "dist", "index.html"), "utf8");
const headEnd = builtHtml.indexOf("</head>");
const linkAt = builtHtml.indexOf('rel="stylesheet"');
check(
  "the stylesheet is a render-blocking <link> in <head>",
  linkAt !== -1 && headEnd !== -1 && linkAt < headEnd,
  linkAt === -1 ? "no stylesheet link in the built page" : `link at ${linkAt}, </head> at ${headEnd}`,
);

const step2 = await evaluate(`(() => {
  const html = document.documentElement;
  const provider = document.querySelector("themvora-provider");
  const readout = document.getElementById("theme-name");
  const style = getComputedStyle(document.body);
  return {
    registered: Boolean(customElements.get("themvora-provider")),
    upgraded: provider?.constructor?.name ?? null,
    theme: html.getAttribute("data-theme"),
    readout: readout?.textContent?.trim() ?? null,
    background: style.backgroundColor,
    tokenBackground: html.style.getPropertyValue("--theme-color-background").trim(),
    injectedStyles: document.querySelectorAll("#themvora-elements-style").length,
  };
})()`);

check("the elements registered from the bare import", step2.registered);
check("the provider upgraded", step2.upgraded !== "HTMLElement", String(step2.upgraded));
check("a theme was applied to <html>", Boolean(step2.theme), String(step2.theme));
check(
  "src/main.ts read the runtime and rendered #theme-name",
  step2.readout === step2.theme,
  `readout ${step2.readout}, theme ${step2.theme}`,
);
check(
  "the runtime emitted its CSS variables",
  step2.tokenBackground.length > 0,
  step2.tokenBackground,
);
check(
  "the documented stylesheet resolved against those variables",
  step2.background !== "rgba(0, 0, 0, 0)",
  step2.background,
);
check(
  "the element stylesheet is injected exactly once",
  step2.injectedStyles === 1,
  `${step2.injectedStyles} injected`,
);
noUnexpectedConsole();

// The build is the easy half: Vite extracts an imported stylesheet into a
// <link> anyway. Development is where the flash actually happened, because
// there an imported stylesheet is injected by the module graph. Serve the same
// files with `vite dev` and block every module: whatever is on screen came
// from <head> alone.
{
  const net = await import("node:net");
  const port = await new Promise((resolvePort) => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port: free } = probe.address();
      probe.close(() => resolvePort(free));
    });
  });

  // Run Vite's own entry with the same interpreter, not `npm run dev`: npm is
  // a shell wrapper on Windows, and the grandchild it spawns does not reliably
  // survive being detached from a script that is already managing a browser.
  //
  // `--host 127.0.0.1` is explicit because Vite's default `localhost` resolves
  // to ::1 here while this script probes IPv4 — the server would be "ready"
  // and every request would still be refused.
  const dev = spawn(
    process.execPath,
    [
      join(project, "node_modules", "vite", "bin", "vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { cwd: project, stdio: "inherit", detached: true },
  );
  dev.unref();

  const devUrl = `http://127.0.0.1:${port}/`;
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try {
      const response = await fetch(devUrl);
      up = response.ok;
    } catch {
      // not listening yet
    }
    if (!up) await new Promise((r) => setTimeout(r, 500));
  }

  if (!up) {
    check("dev server started", false, `no response from ${devUrl}`);
  } else {
    await send("Network.setBlockedURLs", {
      urls: ["*/@vite/*", "*/src/*.ts", "*/src/*.tsx", "*/@fs/*", "*/@id/*"],
    });
    await send("Page.navigate", { url: devUrl });
    await new Promise((r) => setTimeout(r, 2000));

    // What is asserted here is *delivery*, not colour: the stylesheet must be a
    // `<link>` that the browser fetched and parsed before any module ran. The
    // colour would need the theme variables, and this minimal setup has no
    // pre-paint script yet — that is the optional zero-flash step, tested below.
    // A CSS import instead of a link leaves `sheet` null here, which is the
    // unstyled first paint the reader sees in dev.
    const devPaint = await evaluate(`(() => {
      const link = [...document.querySelectorAll('link[rel="stylesheet"]')]
        .find((l) => (l.getAttribute("href") ?? "").includes("/src/style.css"));
      const sheet = link?.sheet ?? null;
      const rules = sheet ? [...sheet.cssRules] : [];
      return {
        title: document.title,
        ready: document.readyState,
        hasLink: Boolean(link),
        rules: rules.length,
        hasBodyRule: rules.some((rule) => rule.selectorText === "body"),
        jsRan: document.querySelectorAll("#themvora-elements-style").length,
      };
    })()`);

    check(
      "dev serves the page stylesheet as render-blocking CSS",
      devPaint.hasLink && devPaint.rules > 0 && devPaint.hasBodyRule,
      `link ${devPaint.hasLink}, ${devPaint.rules} rules, body rule ${devPaint.hasBodyRule}` +
        ` — title "${devPaint.title}", ${devPaint.ready}`,
    );
    check(
      "that stylesheet arrived without any module running",
      devPaint.jsRan === 0,
      "the element stylesheet was injected, so a module ran",
    );
    await send("Network.setBlockedURLs", { urls: [] });
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(dev.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-dev.pid);
    } catch {
      dev.kill();
    }
  }
}

// --- Stage 2: the guide's step 3 -------------------------------------------
// A toggle and a family select, still on the same `src/main.ts`.

stage("step 3 — add a small UI (toggle + family select)");
write("index.html", snippets.snippet.code);
build("step 3");
await load();

const step3 = await evaluate(`(async () => {
  const html = document.documentElement;
  const toggle = document.querySelector("themvora-toggle");
  const button = toggle?.querySelector("button");
  const select = document.querySelector("themvora-select[type=family]");
  const readout = document.getElementById("theme-name");

  const before = html.getAttribute("data-theme");
  const beforeReadout = readout?.textContent?.trim();
  button?.click();
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
  const after = html.getAttribute("data-theme");
  const afterReadout = readout?.textContent?.trim();

  const options = Array.from(select?.querySelectorAll("option") ?? []).map((o) => o.value);
  return {
    toggleMode: toggle?.getAttribute("data-mode") ?? null,
    pressed: button?.getAttribute("aria-pressed") ?? null,
    before,
    after,
    beforeReadout,
    afterReadout,
    options,
    theme: html.getAttribute("data-theme"),
  };
})()`);

check(
  "the toggle reports its state on the host",
  ["light", "dark", "system"].includes(step3.toggleMode ?? ""),
  String(step3.toggleMode),
);
check(
  "the toggle exposes aria-pressed on the real button",
  ["true", "false", "mixed"].includes(step3.pressed ?? ""),
  String(step3.pressed),
);
check(
  "clicking the toggle changed the theme",
  step3.before !== step3.after,
  `${step3.before} → ${step3.after}`,
);
check(
  "#theme-name followed the change",
  step3.afterReadout === step3.after && step3.beforeReadout === step3.before,
  `${step3.beforeReadout} → ${step3.afterReadout} (theme ${step3.after})`,
);
check(
  "the family select was populated from the runtime catalog",
  step3.options.length >= 2,
  step3.options.join(","),
);
noUnexpectedConsole();

// --- Stage 3: the guide's "Theme configuration" -----------------------------
// `quickStart` replaces `index.html` while `src/main.ts` stays. The guide calls
// this "the same setup with your own themes and options turned on", so it has
// to keep working with the module the reader already wrote.

stage("configuration — themes + default-theme + initial-mode");
write("index.html", snippets.quickStart.code);
build("configuration");
await load();

const config = await evaluate(`(async () => {
  const html = document.documentElement;
  const host = document.querySelector("themvora-select[type=family]");
  const select = host?.querySelector("select");
  const options = Array.from(select?.querySelectorAll("option") ?? []).map((o) => o.value);

  // Drive the documented control, not a private accessor: choose the family
  // named by the themes attribute and read what the page resolves to.
  let afterSelect = null;
  if (select) {
    select.value = "plum";
    select.dispatchEvent(new Event("change"));
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 80)));
    afterSelect = html.getAttribute("data-theme");
  }

  const readout = document.getElementById("theme-name");
  return {
    theme: html.getAttribute("data-theme"),
    options,
    afterSelect,
    readout: readout?.textContent?.trim() ?? null,
    hasReadout: Boolean(readout),
  };
})()`);

check(
  "the family select offered the families named by `themes`",
  ["default", "plum"].every((name) => config.options.includes(name)),
  config.options.join(","),
);
check(
  "selecting the configured family resolved to its theme",
  typeof config.afterSelect === "string" && config.afterSelect.startsWith("plum-"),
  String(config.afterSelect),
);
check(
  "the configured page keeps the #theme-name readout working",
  config.hasReadout && config.readout === config.theme,
  config.hasReadout ? `readout ${config.readout}, theme ${config.theme}` : "#theme-name is missing",
);
noUnexpectedConsole();

// --- Stage 4: "More Examples" — scoped theming ------------------------------
// `snippet2` replaces `index.html` again. It is the scoped-theming example, and
// the interesting property is that a pinned theme survives a mode change.

stage("more examples — scoped theming");
write("index.html", snippets.snippet2.code);
build("scoped");
await load();

const scoped = await evaluate(`(async () => {
  const html = document.documentElement;
  const outer = document.querySelector('themvora-scope[theme="cocoa-dark"]');
  const inner = document.querySelector('themvora-scope[theme="berry-light"]');
  const mode = document.querySelector("themvora-select[type=mode] select");

  const settle = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 80)));
  const snap = () => ({
    outer: outer?.getAttribute("data-theme"),
    inner: inner?.getAttribute("data-theme"),
    page: html.getAttribute("data-theme"),
  });

  const before = snap();

  // Drive the mode control the snippet ships; a scoped theme is pinned, so the
  // page theme should move while both scopes stay put.
  mode.value = "dark";
  mode.dispatchEvent(new Event("change"));
  await settle();
  const afterDark = snap();

  mode.value = "light";
  mode.dispatchEvent(new Event("change"));
  await settle();
  const afterLight = snap();

  return {
    before,
    afterDark,
    afterLight,
    background: outer ? getComputedStyle(outer.querySelector("section")).backgroundColor : null,
    readout: document.getElementById("theme-name")?.textContent?.trim() ?? null,
    hasReadout: Boolean(document.getElementById("theme-name")),
  };
})()`);

check(
  "the exact-name scope resolved",
  scoped.before.outer === "cocoa-dark",
  String(scoped.before.outer),
);
check(
  "the nested scope overrode its ancestor",
  scoped.before.inner === "berry-light",
  String(scoped.before.inner),
);
check(
  "the mode control changed the page theme",
  scoped.afterDark.page !== scoped.afterLight.page,
  `${scoped.afterDark.page} → ${scoped.afterLight.page}`,
);
check(
  "a pinned scope survived the mode change",
  scoped.afterDark.outer === "cocoa-dark" && scoped.afterLight.outer === "cocoa-dark",
  `${scoped.afterDark.outer} / ${scoped.afterLight.outer}`,
);
check(
  "the scoped subtree actually painted",
  Boolean(scoped.background) && scoped.background !== "rgba(0, 0, 0, 0)",
  String(scoped.background),
);
check(
  "this drop-in index.html kept the #theme-name contract",
  scoped.hasReadout && scoped.readout === scoped.afterLight.page,
  scoped.hasReadout ? `readout ${scoped.readout}, theme ${scoped.afterLight.page}` : "#theme-name is missing",
);
noUnexpectedConsole();

// --- Stage 5: the optional zero-flash script --------------------------------
// `snippet3` writes `public/theme-bootstrap.js`; the docs tell the reader to
// load it from `<head>`. Run the snippet itself, wire the tag, rebuild, then
// block the JS bundle: whatever is on screen at that point came from the
// pre-paint script alone.

stage("zero flash — scripts/write-pre-paint.mjs");
write("scripts/write-pre-paint.mjs", snippets.snippet3.code);
run("node scripts/write-pre-paint.mjs", project);
check(
  "the snippet wrote public/theme-bootstrap.js",
  existsSync(join(project, "public", "theme-bootstrap.js")),
);

const bootstrap = snippets.noTheme.code.replace(
  "</head>",
  '    <script src="/theme-bootstrap.js"></script>\n  </head>',
);
write("index.html", bootstrap);
write("src/main.ts", snippets.setupExtra.code);
build("zero flash");
await load({ blockScripts: true });

const prePaint = await evaluate(`(() => {
  const html = document.documentElement;
  const style = getComputedStyle(document.body);
  return {
    theme: html.getAttribute("data-theme"),
    ready: html.getAttribute("data-theme-ready"),
    background: style.backgroundColor,
    token: html.style.getPropertyValue("--theme-color-background").trim(),
    bundleRan: Boolean(document.querySelector("#theme-name")?.textContent?.trim()),
  };
})()`);

check(
  "the page is themed with the module bundle blocked",
  Boolean(prePaint.theme) && prePaint.background !== "rgba(0, 0, 0, 0)",
  `theme ${prePaint.theme}, background ${prePaint.background}`,
);
check(
  "the pre-paint script wrote the CSS variables",
  prePaint.token.length > 0,
  prePaint.token,
);
check(
  "the bundle really was blocked (so this proves pre-paint, not hydration)",
  prePaint.bundleRan === false,
  "the module ran anyway",
);

// --- Report -----------------------------------------------------------------

await send("Network.setBlockedURLs", { urls: [] });
server.close();
try {
  process.kill(-browser.pid);
} catch {
  browser.kill();
}
rmSync(profileDir, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} checks passed ===`);
if (failed.length > 0) {
  console.log("\nFailures:");
  for (const f of failed) console.log(`  ✗ ${f.stage} · ${f.label}${f.detail ? ` — ${f.detail}` : ""}`);
}

if (keep) {
  console.log(`\nProject kept at: ${project}`);
} else {
  rmSync(scratch, { recursive: true, force: true });
}

process.exit(failed.length === 0 ? 0 : 1);
