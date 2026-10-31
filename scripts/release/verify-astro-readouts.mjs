#!/usr/bin/env node
/**
 * Bootstrap-readout regression gate for the Astro example.
 *
 * Guards the contract `data-tv-readout` encodes: the pre-paint bootstrap
 * resolves the selection from `<head>`, patches `[data-tv-readout]` from a
 * MutationObserver as the body is parsed, and nothing on the page may settle
 * afterwards. A visitor must never see a value they are not looking at — no
 * `—` placeholder surviving a paint, no stale value correcting itself on load.
 *
 * Every row is a real browser, because the thing under test is a *frame order*.
 * Unit tests cannot establish that no intermediate painted frame showed the
 * wrong value.
 *
 * ## The example is a static build
 *
 * `examples/apps/astro` uses Astro's default `output: "static"`, so `astro
 * build` produces `dist/index.html` + `dist/island/index.html` and there is no
 * `dist/server/entry.mjs` to boot. Serving is therefore `astro preview`, which
 * serves that static output — the repository's own Astro workflow. A static
 * page cannot read cookies at build time, so the prerendered `<html>` is always
 * the configured default; the *client* bootstrap is what applies the persisted
 * selection. That is precisely why the readouts are asserted on the first frame
 * they exist rather than against the server render.
 *
 * ## What each row asserts
 *
 * For every frame the recorder captures:
 *   - each readout that is present in the DOM is already patched and correct
 *     (a present readout reading `—` is a failure, not a warm-up state);
 *   - `data-theme`, `data-theme-mode`, `data-theme-family`,
 *     `data-theme-selection-mode`, `data-theme-selection-family` match the
 *     expected selection, and `data-theme-ready` is `true`;
 *   - the readout text agrees with the attributes — a readout naming a family
 *     the document is not themed with is the "family fluctuates on reload" bug;
 *   - the readout text never changes once it is complete.
 *
 * ## Expectations are derived, not hardcoded
 *
 * The registered families, the fallback family, the fingerprint and the
 * resolved theme names are read out of the *built* bootstrap script. A gate
 * that hardcodes `mint-*` keeps passing after the example renames its themes,
 * which is how the previous version of this file rotted into a no-op. Anything
 * that cannot be derived fails the gate loudly.
 *
 * ## There is no SKIP path
 *
 * A green result must mean the matrix actually ran. A missing build output, a
 * missing fixture, a missing browser, a server that will not start and a failed
 * assertion all exit non-zero with an actionable message. Do not add a SKIP
 * branch: a gate that passes without running is worse than one that fails.
 *
 * Usage:
 *   node scripts/release/verify-astro-readouts.mjs              # build + verify
 *   node scripts/release/verify-astro-readouts.mjs --skip-build # reuse dist/
 *
 * Requires: headless Chromium (Playwright's, or `THEMVORA_CHROME`) and `ws`.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

// Derived from this file's location, not hardcoded: a hardcoded absolute repo
// root is what let the previous version of this gate point at a directory that
// no longer existed while still reporting success.
const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const exampleRoot = join(repoRoot, "examples", "apps", "astro");
const distDir = join(exampleRoot, "dist");

/**
 * The example's Astro CLI.
 *
 * Resolved from the package's own `bin` field, not from a hardcoded
 * `node_modules/astro/astro.js`. Astro 7 moved that entry point to
 * `bin/astro.mjs`, and the hardcoded path is why this gate had been failing
 * closed with "the example's Astro CLI is missing" ever since — a gate that
 * cannot run does not guard anything, and the contract it describes looked
 * green only because nobody could start it. `verify-astro-interaction.mjs`
 * documents the same trap.
 */
function resolveAstroCli() {
  const conventional = join(exampleRoot, "node_modules", "astro", "astro.js");
  try {
    const pkgPath = createRequire(join(exampleRoot, "package.json")).resolve(
      "astro/package.json",
    );
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.astro;
    if (bin) return join(dirname(pkgPath), bin);
  } catch {
    // Fall through: the existence check below reports the conventional path.
  }
  return conventional;
}

const astroJs = resolveAstroCli();
const skipBuild = process.argv.includes("--skip-build");

/**
 * One row per page the matrix runs against.
 *
 * The React-island page used to live here as `/island/`. It moved to
 * `examples/apps/astro-react` when the examples were split by framework, and
 * this matrix was never retargeted — so the fixture check below failed on a
 * page that had not existed for two releases. Island coverage is
 * `verify-astro-interaction.mjs`'s job (it drives `astro-native` and
 * `astro-react`); this gate covers the framework-free page, which is the one
 * that has to be correct without a client framework.
 */
const PAGES = [{ label: "native", path: "/" }];

class GateError extends Error {
  constructor(message, detail) {
    super(message);
    this.detail = detail;
  }
}

function fail(message, detail) {
  throw new GateError(message, detail);
}

// ---------------------------------------------------------------------------
// Process teardown. Registered as we go so a failure at any point still leaves
// no orphaned Chromium or preview server behind.
// ---------------------------------------------------------------------------
const teardown = [];
let cdp = null;
let browserChild = null;

async function shutdown() {
  if (cdp) await cdp.send("Browser.close").catch(() => {});
  if (browserChild) { try { browserChild.kill(); } catch {} }
  for (const fn of teardown.reverse()) { try { fn(); } catch {} }
}

function findChrome() {
  if (process.env.THEMVORA_CHROME && existsSync(process.env.THEMVORA_CHROME))
    return process.env.THEMVORA_CHROME;
  const pwRoot = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "ms-playwright")
    : join(os.homedir(), "AppData", "Local", "ms-playwright");
  if (!existsSync(pwRoot)) return null;
  for (const d of readdirSync(pwRoot).filter((x) => /^chromium(-\d+)?$/.test(x))) {
    const exe = join(pwRoot, d, "chrome-win64", "chrome.exe");
    if (existsSync(exe)) return exe;
  }
  return null;
}

function findWs() {
  // Resolve it the way Node would, first. The `.pnpm` scan below assumes the
  // default linker, and this workspace is installed hoisted
  // (`--config.node-linker=hoisted`) — so the scan finds nothing and the gate
  // reported "the `ws` package is not installed" on a machine where it is.
  try {
    return dirname(
      createRequire(join(repoRoot, "package.json")).resolve("ws/package.json"),
    );
  } catch {
    // fall through to the pnpm store layout
  }
  const pnpm = join(repoRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpm)) return null;
  const dirs = readdirSync(pnpm).filter((d) => /^ws@\d+\.\d+\.\d+$/.test(d)).sort();
  for (const d of dirs.reverse()) {
    const p = join(pnpm, d, "node_modules", "ws", "package.json");
    if (existsSync(p)) return join(pnpm, d, "node_modules", "ws");
  }
  return null;
}

/** A port the OS says is free, so a stale server on a fixed port cannot fool us. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** Reads a `"literal"` out of the built bootstrap script. */
function literal(source, re, label) {
  const m = source.match(re);
  if (!m) {
    fail(
      `could not read ${label} out of the built bootstrap script`,
      "The gate derives its expectations from the built script. If the " +
        "integration's emitted shape changed, update the patterns here rather " +
        "than hardcoding values — a hardcoded gate is how this file previously " +
        "rotted into a no-op.",
    );
  }
  return m[1];
}

const RECORDER = `(function(){
  window.__tvFrames = [];
  var last = null;
  function txt(kind){
    var el = document.querySelector('[data-tv-readout="' + kind + '"]');
    return el ? (el.textContent || "").trim() : null;
  }
  // Every pressed option the page rendered, as kind -> value -> "true"/"false".
  // Recorded per frame rather than once at the end: the defect is a *frame
  // order*, and a control that was briefly unpressed leaves no trace in the
  // settled DOM.
  function pressed(){
    var out = {};
    var els = document.querySelectorAll('[data-tv-pressed]');
    for (var i = 0; i < els.length; i++) {
      var kind = els[i].getAttribute('data-tv-pressed');
      var value = els[i].getAttribute('data-tv-value');
      if (!kind || value == null) continue;
      (out[kind] || (out[kind] = {}))[value] = els[i].getAttribute('aria-pressed');
    }
    return out;
  }
  function snap(){
    var de = document.documentElement;
    var f = {
      t: Math.round(performance.now()),
      label: txt("label"),
      theme: txt("theme"), mode: txt("mode"), family: txt("family"),
      pressed: pressed(),
      count: document.querySelectorAll("[data-tv-readout]").length,
      dt: de.getAttribute("data-theme"),
      dm: de.getAttribute("data-theme-mode"),
      df: de.getAttribute("data-theme-family"),
      dsm: de.getAttribute("data-theme-selection-mode"),
      dsf: de.getAttribute("data-theme-selection-family"),
      ready: de.getAttribute("data-theme-ready"),
      dark: de.classList.contains("dark")
    };
    var sig = JSON.stringify([f.label, f.theme, f.mode, f.family, f.pressed, f.count,
      f.dt, f.dm, f.df, f.dsm, f.dsf, f.ready, f.dark]);
    if (sig !== last) { last = sig; window.__tvFrames.push(f); }
  }
  var n = 0;
  function loop(){ snap(); if (++n < 900) requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();`;

async function main() {
  console.log("\n=== ASTRO READOUT GATE ===\n");
  console.log(`  example: examples/apps/astro (static build, served by \`astro preview\`)`);

  // --- 1. build -------------------------------------------------------------
  if (skipBuild) {
    console.log("  build:   skipped (--skip-build), reusing dist/");
  } else {
    if (!existsSync(astroJs)) {
      fail(
        `the example's Astro CLI is missing at ${astroJs}`,
        "Install the workspace first (the example depends on the local " +
          "`astro` install). `pnpm` is not usable on every host; a plain " +
          "`npm install` inside examples/apps/astro works.",
      );
    }
    console.log("  build:   astro build …");
    const built = spawnSync(process.execPath, [astroJs, "build"], {
      cwd: exampleRoot,
      encoding: "utf8",
    });
    if (built.status !== 0) {
      fail(
        `\`astro build\` failed with exit code ${built.status}`,
        `${built.stdout ?? ""}${built.stderr ?? ""}`.trim().slice(-1200),
      );
    }
  }

  // --- 2. fixtures ----------------------------------------------------------
  const indexPath = join(distDir, "index.html");
  if (!existsSync(indexPath)) {
    fail(
      `${indexPath} not found`,
      "The Astro example is a *static* build: `astro build` must produce " +
        "dist/index.html. Do not look for dist/server/entry.mjs — there is no " +
        "server entry to boot.",
    );
  }

  const indexHtml = await readFile(indexPath, "utf8");
  const readoutKinds = new Set(
    [...indexHtml.matchAll(/data-tv-readout="([^"]+)"/g)].map((m) => m[1]),
  );
  // The page declares the kinds it renders; the matrix asserts those and only
  // those. Counting elements instead would break every time the page adds or
  // removes a readout — which is how this check ended up asserting "at least 3"
  // against a page that now renders 2.
  for (const kind of ["label", "mode"]) {
    if (!readoutKinds.has(kind)) {
      fail(
        `dist/index.html renders no [data-tv-readout="${kind}"] element`,
        "The hero pill is two bootstrap readouts (label · mode). If the example " +
          "stopped rendering them, the matrix has nothing to verify.",
      );
    }
  }
  const pressedCount = (indexHtml.match(/data-tv-pressed=/g) ?? []).length;
  if (pressedCount === 0) {
    fail(
      "dist/index.html renders no [data-tv-pressed] element",
      "The mode segment and the preset chips opt into the pressed contract. " +
        "Without them this gate cannot assert that a server-rendered control " +
        "agrees with the theme it is drawn on.",
    );
  }

  const bootstrap = [...indexHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .find((s) => s.includes("var fams="));
  if (!bootstrap) {
    fail(
      "no pre-paint bootstrap script found in dist/index.html",
      "Expected an inline <head> script declaring `var fams=[…]`. Without it " +
        "the page has no zero-flash path and the matrix is meaningless.",
    );
  }

  const families = JSON.parse(literal(bootstrap, /var fams=(\[[^\]]*\])/, "the registered families"));
  const fallbackFamily = literal(bootstrap, /indexOf\(fam0\)!==-1\?fam0:"([^"]*)"/, "the fallback family");
  const fingerprint = literal(bootstrap, /fp!=="([^"]*)"/, "the selection fingerprint");
  const names = JSON.parse(literal(bootstrap, /var names=(\{[\s\S]*?\});var (?:lbl|key)=/, "the theme-name map"));
  // Theme **name** → human label. The pill's first readout is the label, and the
  // pre-paint script can only resolve it from this map — a name cannot be turned
  // into a label by rule.
  const labels = JSON.parse(literal(bootstrap, /var lbl=(\{[\s\S]*?\});var key=/, "the theme-label map"));
  // The mode a first-time visitor gets. A `system` case is only meaningful when
  // the *selection mode* is `system`, which a returning visitor expresses with a
  // `theme-mode=system` cookie — the configured default here is `light`, so the
  // matrix seeds it rather than assuming it.
  const fallbackMode = literal(bootstrap, /var mode=hasMode\?mode0:"([^"]*)"/, "the fallback mode");

  // Mirrors the bootstrap's own resolution: `key = map[family+":"+eff] ?
  // family+":"+eff : "__default-"+eff`, then `names[key] || names["__default-"+eff]`.
  const themeName = (family, eff) => names[`${family}:${eff}`] ?? names[`__default-${eff}`] ?? null;
  const lightTheme = themeName(fallbackFamily, "light");
  const darkTheme = themeName(fallbackFamily, "dark");
  if (!lightTheme || !darkTheme) {
    fail(
      `could not derive the light/dark theme names for family "${fallbackFamily}"`,
      `families=${JSON.stringify(families)} names=${JSON.stringify(names)}`,
    );
  }

  // A family the registry does not have, standing in for a selection persisted
  // before the example changed its families — the "oat/mint fluctuation".
  const staleFamily = ["mint", "plum", "brand", "oak"].find((f) => !families.includes(f));
  if (!staleFamily) {
    fail(
      "every candidate stale family is actually registered",
      `families=${JSON.stringify(families)} — pick another candidate so the ` +
        "stale-persisted-selection case still tests something.",
    );
  }

  console.log(`  fixture: families=${JSON.stringify(families)} fallback=${fallbackFamily}`);
  console.log(`  fixture: light=${lightTheme} dark=${darkTheme} stale=${staleFamily}`);
  console.log(`  fixture: fingerprint=${fingerprint}`);

  // --- 3. browser toolchain -------------------------------------------------
  const chromePath = findChrome();
  if (!chromePath) {
    fail(
      "headless Chromium not found",
      "Install Playwright's Chromium, or point THEMVORA_CHROME at a chrome.exe.",
    );
  }
  const wsPath = findWs();
  if (!wsPath) fail("the `ws` package is not installed under node_modules/.pnpm");
  const require = createRequire(import.meta.url);
  const WebSocket = require(wsPath);

  // --- 4. serve the built output -------------------------------------------
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    [astroJs, "preview", "--host", "127.0.0.1", "--port", String(port)],
    { cwd: exampleRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
  teardown.push(() => server.kill());
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d));
  server.stderr.on("data", (d) => (serverLog += d));

  let serving = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) {
      fail(
        `\`astro preview\` exited early with code ${server.exitCode}`,
        serverLog.trim().slice(-1000),
      );
    }
    try {
      const res = await fetch(`${base}/`);
      if (res.ok) { serving = true; break; }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!serving) {
    fail(
      "`astro preview` never started serving (30 s timeout)",
      serverLog.trim().slice(-1000),
    );
  }
  console.log(`  serve:   astro preview on ${base}`);

  // --- 5. CDP --------------------------------------------------------------
  const profile = mkdtempSync(join(os.tmpdir(), "tv-readout-"));
  browserChild = spawn(
    chromePath,
    ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
     "--no-first-run", "--no-proxy-server", "--disable-gpu", "--window-size=1200,900",
     "about:blank"],
    { stdio: "ignore", detached: true },
  );
  browserChild.unref();
  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 80; i++) {
    if (existsSync(portFile)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!existsSync(portFile)) fail("headless Chromium did not expose a CDP endpoint");

  const [cdpPort, browserPath = "/devtools/browser"] = (await readFile(portFile, "utf8"))
    .split("\n").map((s) => s.trim());

  cdp = await new Promise((resolve, reject) => {
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
      for (const l of listeners) l(raw);
    });
    const send = (method, params = {}, sessionId) =>
      new Promise((res, rej) => {
        const i = ++id;
        pending.set(i, { resolve: res, reject: rej });
        ws.send(JSON.stringify(sessionId ? { sessionId, id: i, method, params } : { id: i, method, params }));
      });
    ws.on("open", () => resolve({ send, on: (h) => listeners.add(h), off: (h) => listeners.delete(h) }));
    ws.on("error", reject);
  });

  // Console errors and uncaught exceptions are part of the contract: the
  // reported "hydration errors" surface here, and a hydration mismatch that
  // React silently repairs would otherwise pass the frame checks.
  const pageIssues = [];
  cdp.on((raw) => {
    const m = JSON.parse(raw);
    if (m.method === "Runtime.consoleAPICalled") {
      const { type, args } = m.params;
      if (type !== "error" && type !== "warning") return;
      const text = args.map((a) => a.value ?? a.description ?? "").join(" ").trim();
      if (!text || /favicon|net::ERR_/i.test(text)) return;
      pageIssues.push({ kind: `console.${type}`, text: text.slice(0, 200) });
    }
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      const text = String(d.exception?.description ?? d.text ?? "unknown");
      if (/favicon|net::ERR_/i.test(text)) return;
      pageIssues.push({ kind: "pageerror", text: text.slice(0, 200) });
    }
  });

  // --- 6. the matrix -------------------------------------------------------
  const cases = [
    {
      name: "persisted dark",
      scheme: "light",
      seed: { mode: "dark" },
      expect: { mode: "dark", eff: "dark", theme: darkTheme },
    },
    {
      name: "system + light OS",
      scheme: "light",
      seed: { mode: "system" },
      expect: { mode: "system", eff: "light", theme: lightTheme },
    },
    {
      name: "system + dark OS",
      scheme: "dark",
      seed: { mode: "system" },
      expect: { mode: "system", eff: "dark", theme: darkTheme },
    },
    {
      name: "system + dark OS + hint",
      scheme: "dark",
      seed: { mode: "system" },
      hint: true,
      expect: { mode: "system", eff: "dark", theme: darkTheme },
    },
    {
      // Not one of the four originals: the cold-visitor path, where the
      // bootstrap's fallback mode has to agree with the configured
      // `initialMode`. A config/runtime mismatch shows up here and nowhere else.
      name: "fresh visitor (initialMode)",
      scheme: "dark",
      seed: null,
      expect: { mode: fallbackMode, eff: "light", theme: lightTheme },
    },
    {
      // Also not one of the four: the reported "it fluctuates between oat and
      // mint on reload" case, where the cookie outlives the family it names.
      // The readout must name the family actually applied.
      name: `stale family (${staleFamily})`,
      scheme: "light",
      seed: { mode: "dark", family: staleFamily },
      expect: { mode: "dark", eff: "dark", theme: darkTheme },
    },
  ];

  const failures = [];
  for (const page of PAGES) {
    for (const c of cases) {
      const label = `${page.label}/${c.name}`;
      const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
      const send = (method, params) => cdp.send(method, params, sessionId);
      const evaluate = async (expression) =>
        (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value;

      await send("Runtime.enable");
      await send("Page.enable");
      await send("Network.enable");
      // A warm cache hides the race; a cold, throttled load widens the window in
      // which a late patch would be visible as a wrong frame.
      await send("Network.setCacheDisabled", { cacheDisabled: true });
      await send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: c.scheme }],
      });
      // Rows share one browser profile, so clear the previous row's cookies —
      // otherwise a seeded `theme-mode=dark` silently turns every later row into
      // a non-system case.
      await send("Network.clearBrowserCookies");
      if (c.seed) {
        for (const [name, value] of [
          ["theme-mode", c.seed.mode],
          ["theme-family", c.seed.family ?? fallbackFamily],
          ["theme-fingerprint", fingerprint],
        ]) {
          await send("Network.setCookie", { name, value, url: base, path: "/" });
        }
      }
      if (c.hint) {
        await send("Network.setExtraHTTPHeaders", {
          headers: { "Sec-CH-Prefers-Color-Scheme": c.scheme },
        });
      }
      await send("Page.addScriptToEvaluateOnNewDocument", { source: RECORDER });

      const loaded = new Promise((res) => {
        const h = (raw) => {
          if (JSON.parse(raw).method === "Page.loadEventFired") { cdp.off(h); res(); }
        };
        cdp.on(h);
      });
      await send("Page.navigate", { url: base + page.path });
      await loaded;
      await new Promise((r) => setTimeout(r, 1500));

      const frames = JSON.parse((await evaluate("JSON.stringify(window.__tvFrames)")) || "[]");
      const problems = [];
      const present = (v) => v !== null && v !== undefined;
      // The readouts this page declares. `theme`/`family` are not rendered here,
      // so they are asserted only when present — a page that later adds them
      // gets the stronger checks for free.
      const complete = frames.filter((f) => present(f.mode) && present(f.label));

      if (!frames.length) {
        problems.push("the recorder captured no frames at all");
      }
      if (!complete.length) {
        problems.push("no frame ever contained both the label and mode readouts");
      }

      // The pill is `label · mode`, and the label is the resolved theme's
      // `meta.label` — not its machine name. Derived from the built bootstrap so
      // the expectation follows the registry rather than a hardcoded string.
      const expectedLabel = labels[c.expect.theme];
      if (!expectedLabel) {
        problems.push(`no meta.label for theme "${c.expect.theme}" in the built bootstrap`);
      }

      for (const f of frames) {
        // Only assert on readouts that exist: the body is parsed element by
        // element, so an early frame may legitimately hold a subset. What is not
        // legitimate is a readout that exists and is not yet patched.
        if (present(f.label) && expectedLabel && f.label !== expectedLabel)
          problems.push(`@${f.t}ms readout label="${f.label}", expected "${expectedLabel}"`);
        if (present(f.theme) && f.theme !== c.expect.theme)
          problems.push(`@${f.t}ms readout theme="${f.theme}", expected "${c.expect.theme}"`);
        if (present(f.mode) && f.mode !== c.expect.mode)
          problems.push(`@${f.t}ms readout mode="${f.mode}", expected "${c.expect.mode}"`);
        if (present(f.family) && f.family !== fallbackFamily)
          problems.push(`@${f.t}ms readout family="${f.family}", expected "${fallbackFamily}"`);
        // The readout must name what the document is actually themed with.
        if (present(f.theme) && present(f.dt) && f.theme !== f.dt)
          problems.push(`@${f.t}ms readout theme="${f.theme}" disagrees with data-theme="${f.dt}"`);
        if (present(f.family) && f.family !== f.dsf)
          problems.push(`@${f.t}ms readout family="${f.family}" disagrees with data-theme-selection-family="${f.dsf}"`);
        if (present(f.family) && present(f.df) && f.family !== f.df)
          problems.push(`@${f.t}ms readout family="${f.family}" disagrees with data-theme-family="${f.df}"`);
        if (present(f.mode) && f.mode !== f.dsm)
          problems.push(`@${f.t}ms readout mode="${f.mode}" disagrees with data-theme-selection-mode="${f.dsm}"`);

        // The selection controls. A server-rendered segment asserts whatever the
        // prerender rendered — usually "nothing selected" — on a page the
        // bootstrap has already painted in the visitor's theme, and corrects
        // itself once the runtime mounts. That is the reported "the mode toggle
        // flickers between light and dark" symptom, and it is invisible in the
        // settled DOM, so it is asserted per frame.
        for (const [kind, expected] of [
          ["mode", c.expect.mode],
          ["family", fallbackFamily],
        ]) {
          const group = f.pressed?.[kind];
          if (!group) continue;
          const values = Object.keys(group);
          if (!values.length) continue;
          const on = values.filter((v) => group[v] === "true");
          if (on.length !== 1) {
            problems.push(
              `@${f.t}ms ${kind} controls pressed=[${on.join(",") || "none"}], expected exactly one (${expected})`,
            );
          } else if (on[0] !== expected) {
            problems.push(`@${f.t}ms ${kind} control pressed="${on[0]}", expected "${expected}"`);
          }
          // Anything not chosen must be an explicit "false", not a missing
          // attribute: a control that never had `aria-pressed` written is a
          // control the contract skipped.
          for (const v of values) {
            if (group[v] !== "true" && group[v] !== "false") {
              problems.push(`@${f.t}ms ${kind} control "${v}" has aria-pressed=${group[v]}`);
            }
          }
        }

        if (f.dt !== c.expect.theme)
          problems.push(`@${f.t}ms data-theme="${f.dt}", expected "${c.expect.theme}"`);
        if (f.dm !== c.expect.eff)
          problems.push(`@${f.t}ms data-theme-mode="${f.dm}", expected "${c.expect.eff}"`);
        if (f.df !== fallbackFamily)
          problems.push(`@${f.t}ms data-theme-family="${f.df}", expected "${fallbackFamily}"`);
        if (f.ready !== "true")
          problems.push(`@${f.t}ms data-theme-ready="${f.ready}", expected "true"`);
        if (f.dark !== (c.expect.eff === "dark"))
          problems.push(`@${f.t}ms dark class=${f.dark}, expected ${c.expect.eff === "dark"}`);
      }

      // A compact timeline, so a fluctuation reads as `a -> b` rather than as a
      // wall of per-frame messages.
      const timeline = [];
      for (const f of complete) {
        const k = `${f.label}/${f.mode}`;
        if (timeline[timeline.length - 1] !== k) timeline.push(k);
      }
      if (timeline.length > 1) {
        problems.push(`readout fluctuated after first paint: ${timeline.join(" -> ")}`);
      }

      const status = problems.length ? "FAIL" : "PASS";
      const first = complete[0];
      console.log(
        `  ${status}  ${label.padEnd(30)} label=${first?.label ?? "-"} mode=${first?.mode ?? "-"} ` +
          `pressed=${JSON.stringify(first?.pressed?.mode ?? {})} frames=${frames.length}`,
      );
      for (const p of [...new Set(problems)].slice(0, 8)) {
        console.log(`        ${p}`);
        failures.push({ label, detail: p });
      }
      if (problems.length > 8) {
        failures.push({ label, detail: `… and ${problems.length - 8} more` });
      }

      await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
    }
  }

  // --- 7. report -----------------------------------------------------------
  if (pageIssues.length) {
    console.log(`\n  console errors/warnings: ${pageIssues.length}`);
    for (const i of pageIssues.slice(0, 8)) console.log(`     [${i.kind}] ${i.text}`);
    failures.push({
      label: "console",
      detail: `${pageIssues.length} console error/warning(s) — hydration mismatches surface here`,
    });
  }

  console.log(`\n  rows: ${PAGES.length * cases.length}, failures: ${failures.length}`);
  for (const f of failures) console.log(`\n  ✗ ${f.label}: ${f.detail}`);
  return failures.length ? 1 : 0;
}

let exitCode = 0;
try {
  exitCode = await main();
} catch (err) {
  if (err instanceof GateError) {
    console.error(`\n  FATAL — ${err.message}`);
    if (err.detail) console.error(`\n${err.detail}`);
  } else {
    console.error(`\n  FATAL — ${err?.stack ?? err}`);
  }
  exitCode = 1;
} finally {
  await shutdown();
}
process.exit(exitCode);
