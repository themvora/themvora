#!/usr/bin/env node
/**
 * Initialization gate for the Astro overlay scrollbar.
 *
 * Guards the contract the reported bug broke: **the custom scrollbar must be
 * there on a normal first load, with no theme change and no second load.**
 *
 * ## The reported bug
 *
 * "The page shows the native scrollbar at first; toggling the theme makes the
 * custom one appear; refreshing returns to the native one."
 *
 * The cause was not the styling and not the overlay engine. `<themvora-scrollbar>`
 * only *follows* a runtime, and on a page with no island nothing published one:
 * `<ThemeToggle />`'s bindings are deliberately lazy and create the runtime on
 * the first click. So initialization was a side effect of the theme-change
 * path — exactly what this gate forbids — and a refresh threw it away.
 *
 * That distinction cannot be seen in the server HTML, in a typecheck, or in a
 * jsdom unit test: the markup is identical whether the overlay will appear in
 * 20 ms or never. It only exists after a real page load, so this gate drives a
 * real browser and reads the DOM at each step.
 *
 * ## What it asserts, per app
 *
 * | Step | Assertion |
 * | ---- | --------- |
 * | built HTML | `<html>` carries `tv-scrollbar` and the hiding CSS — the pre-paint half |
 * | cold load | rails exist, vertical rail has height, native bar is hidden, `tv-scrollbar-ready` is set |
 * | cold load | the theme has **not** changed (no interaction happened) |
 * | scroll | the thumb moves |
 * | theme change | the theme moves, the rail count and the rail node itself do not |
 * | refresh | everything is back, with the theme that was selected |
 * | opposite initial theme | same guarantees from the other starting mode |
 *
 * ## No SKIP path
 *
 * A missing build, a missing page, a missing browser, a server that will not
 * start and a failed assertion all exit non-zero with an actionable message.
 *
 * Usage:
 *   node scripts/release/verify-astro-scrollbar.mjs
 *   node scripts/release/verify-astro-scrollbar.mjs --skip-build
 *   node scripts/release/verify-astro-scrollbar.mjs --app astro-native
 *
 * Requires Node >= 22.23.4 (Astro 7's floor) and a headless Chromium —
 * Playwright's, or `THEMVORA_CHROME`.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const skipBuild = process.argv.includes("--skip-build");
const appFilter = (() => {
  const i = process.argv.indexOf("--app");
  return i === -1 ? null : process.argv[i + 1];
})();

/** Astro 7 refuses to run below this; the preview server dies with a bare message. */
const MIN_NODE = [22, 23, 4];

class GateError extends Error {
  constructor(message, detail) {
    super(message);
    this.detail = detail;
  }
}

function fail(message, detail) {
  throw new GateError(message, detail);
}

const teardown = [];
async function shutdown() {
  for (const fn of teardown.reverse()) {
    try {
      await fn();
    } catch {
      /* best effort */
    }
  }
}

function assertNodeVersion() {
  const [major, minor, patch] = process.versions.node.split(".").map(Number);
  const [rMajor, rMinor, rPatch] = MIN_NODE;
  const ok =
    major > rMajor ||
    (major === rMajor && (minor > rMinor || (minor === rMinor && patch >= rPatch)));
  if (!ok) {
    fail(
      `Node ${process.versions.node} cannot run Astro 7 (needs >= ${MIN_NODE.join(".")})`,
      "The preview server exits immediately under an older Node, which would " +
        "look like a broken example. Re-run this gate with a supported Node.",
    );
  }
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
  try {
    return createRequire(import.meta.url).resolve("ws");
  } catch {
    // fall through to the global WebSocket
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
      "The gate derives its expectations from the build. If the integration's " +
        "emitted shape changed, update the patterns here rather than hardcoding " +
        "values — a hardcoded gate stops testing anything.",
    );
  }
  return m[1];
}

/**
 * The scrollbar state of the document.
 *
 * @remarks
 * Everything is read from the DOM: no Themvora global, so a failure means the
 * *page* is wrong rather than that an internal shape moved.
 *
 * The rail count is deliberately `.tv-scrollbar[data-themvora-host]` rather
 * than `.tv-scrollbar` — `<html>` itself carries the `tv-scrollbar` class, and
 * counting it would let a page that never drew a rail look initialized.
 */
const PROBE = `(() => {
  const root = document.documentElement;
  const rails = [...document.querySelectorAll('.tv-scrollbar[data-themvora-host]')];
  const vertical = rails.find((e) => e.classList.contains('tv-v'));
  const thumb = vertical ? vertical.querySelector('.tv-thumb') : null;
  const rect = (el) => (el ? el.getBoundingClientRect() : null);
  return {
    path: location.pathname,
    theme: root.getAttribute('data-theme'),
    mode: root.getAttribute('data-theme-mode'),
    // The pre-paint half: the class is in the server HTML, so it is present
    // before any script runs.
    hidingClass: root.classList.contains('tv-scrollbar'),
    // The overlay half: only set once the manager has drawn a frame.
    ready: root.classList.contains('tv-scrollbar-ready'),
    nativeWidth: getComputedStyle(root).scrollbarWidth,
    rails: rails.length,
    railHeight: vertical ? Math.round(rect(vertical).height) : 0,
    railVisible: vertical ? getComputedStyle(vertical).display !== 'none' : false,
    thumbHeight: thumb ? Math.round(rect(thumb).height) : 0,
    thumbTop: thumb ? Math.round(rect(thumb).top) : -1,
    thumbColor: thumb ? getComputedStyle(thumb).backgroundColor : null,
    // Marks the live node so a rebuild is detectable: a recreated rail loses it.
    marked: rails.some((e) => e.dataset.gateMark === 'kept'),
    scrollY: Math.round(window.scrollY),
    scrollable: document.scrollingElement.scrollHeight - window.innerHeight > 0,
    islands: [...document.querySelectorAll('astro-island')].map((el) => !el.hasAttribute('ssr')),
  };
})()`;

/** Scrolls to a fraction of the document's real scrollable range. */
function scrollToFraction(fraction) {
  return `(() => {
    const el = document.scrollingElement;
    const max = Math.max(0, el.scrollHeight - window.innerHeight);
    // A fraction of the *range*, not an absolute offset: the example pages are
    // only a few hundred pixels taller than the viewport, and an absolute
    // value clamps to the same position twice — which would make "the thumb
    // moved" fail for a page that is working correctly.
    window.scrollTo(0, Math.round(max * ${fraction}));
    return Math.round(window.scrollY);
  })()`;
}
/** Clicks the Nth `[data-tv-toggle]`. */
function clickToggle(index = 0) {
  return `(() => {
    const btns = [...document.querySelectorAll('[data-tv-toggle]')];
    const btn = btns[${index}];
    if (!btn) return { error: 'no [data-tv-toggle] at index ${index}' };
    btn.click();
    return true;
  })()`;
}

/** Clicks a button by its visible label, for the React island. */
function clickButton(label) {
  return `(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (n) => (n.textContent || '').trim() === ${JSON.stringify(label)},
    );
    if (!btn) return { error: 'no button labelled ' + ${JSON.stringify(label)} };
    btn.click();
    return true;
  })()`;
}

/** Marks every live rail, so a later step can tell "kept" from "recreated". */
const MARK_RAILS = `(() => {
  const rails = [...document.querySelectorAll('.tv-scrollbar[data-themvora-host]')];
  for (const r of rails) r.dataset.gateMark = 'kept';
  return rails.length;
})()`;

const APPS = [
  {
    name: "astro-native",
    root: join(repoRoot, "examples", "apps", "astro-native"),
    index: "index.html",
    // The native app's toggle is a real <button data-tv-toggle>.
    toggle: () => clickToggle(0),
    hasIsland: false,
  },
  {
    name: "astro-react",
    root: join(repoRoot, "examples", "apps", "astro-react"),
    index: "index.html",
    // The island renders its own button; there is no data attribute to click.
    toggle: () => clickButton("Toggle light / dark"),
    hasIsland: true,
  },
];

async function runApp(app, chromePath, WebSocket) {
  console.log(`\n${"=".repeat(72)}\n  ${app.name}\n${"=".repeat(72)}`);

  const appRequire = createRequire(join(app.root, "package.json"));
  let astroJs;
  try {
    const pkgPath = appRequire.resolve("astro/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.astro;
    astroJs = join(dirname(pkgPath), bin);
  } catch {
    astroJs = join(app.root, "node_modules", "astro", "astro.js");
  }
  if (!existsSync(astroJs)) {
    fail(
      `the example's Astro CLI is missing at ${astroJs}`,
      "Install the workspace first.",
    );
  }

  if (skipBuild) {
    console.log("  build skipped (--skip-build)");
  } else {
    console.log("  astro build …");
    const built = spawnSync(process.execPath, [astroJs, "build"], {
      cwd: app.root,
      encoding: "utf8",
    });
    if (built.status !== 0) {
      fail(
        `\`astro build\` failed in ${app.name} with exit code ${built.status}`,
        `${built.stdout ?? ""}${built.stderr ?? ""}`.trim().slice(-1500),
      );
    }
  }

  // --- the server half: the pre-paint markers must be in the HTML -----------
  const indexHtml = await readFile(join(app.root, "dist", app.index), "utf8");
  const htmlTag = indexHtml.match(/<html[^>]*>/)?.[0] ?? "";
  const serverClass = htmlTag.match(/class="([^"]*)"/)?.[1] ?? "";
  console.log(`  built <html class>: "${serverClass}"`);

  if (!/\btv-scrollbar\b/.test(serverClass)) {
    fail(
      `${app.name}: the server-rendered <html> has no \`tv-scrollbar\` class`,
      "The overlay can only be the *only* scrollbar from the first frame if the " +
        "class and the hiding CSS are in the HTML. Pair <ThemeScrollbar /> with " +
        "`scrollbar` on provider.astro (or themvora({ scrollbar })).",
    );
  }
  if (!/scrollbar-width:none/.test(indexHtml)) {
    fail(
      `${app.name}: the pre-paint scrollbar CSS is not in the built HTML`,
      "Expected provider.astro to inline createPrePaintScrollbarCSS() when " +
        "`scrollbar` is set.",
    );
  }
  if (!indexHtml.includes("<themvora-scrollbar")) {
    fail(
      `${app.name}: the built HTML does not contain <themvora-scrollbar>`,
      "<ThemeScrollbar /> must be mounted by the layout for the overlay to exist.",
    );
  }

  const bootstrap = [...indexHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .find((s) => s.includes("var fams="));
  if (!bootstrap) {
    fail(
      `${app.name}: no pre-paint bootstrap script found`,
      "Expected an inline <head> script declaring `var fams=[…]`.",
    );
  }
  const families = JSON.parse(literal(bootstrap, /var fams=(\[[^\]]*\])/, "the registered families"));
  const fallbackFamily = literal(bootstrap, /indexOf\(fam0\)!==-1\?fam0:"([^"]*)"/, "the fallback family");
  // Tolerant of what is emitted between `names` and `key`: the pre-paint script
  // gained a `var lbl={…}` (theme name → label) for the `label` readout, and an
  // anchor on `;var key=` alone turned that addition into a `JSON.parse`
  // failure here rather than a gate that still worked.
  const names = JSON.parse(literal(bootstrap, /var names=(\{[\s\S]*?\});var (?:lbl|key)=/, "the theme-name map"));
  const themeOf = (family, mode) => {
    const name = names[`${family}:${mode}`] ?? names[`__default-${mode}`];
    if (!name) {
      fail(
        `could not derive the ${mode} theme name for family "${family}" in ${app.name}`,
        `families=${JSON.stringify(families)} names=${JSON.stringify(names)}`,
      );
    }
    return name;
  };
  console.log(`  families=${JSON.stringify(families)} fallback=${fallbackFamily}`);

  // --- serve ----------------------------------------------------------------
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    [astroJs, "preview", "--host", "127.0.0.1", "--port", String(port)],
    { cwd: app.root, stdio: ["ignore", "pipe", "pipe"] },
  );
  teardown.push(() => server.kill());
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d));
  server.stderr.on("data", (d) => (serverLog += d));

  let serving = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) {
      fail(
        `\`astro preview\` exited early in ${app.name} with code ${server.exitCode}`,
        serverLog.trim().slice(-1200),
      );
    }
    try {
      if ((await fetch(`${base}/`)).ok) {
        serving = true;
        break;
      }
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!serving) {
    fail(
      `\`astro preview\` never started serving ${app.name} (30 s timeout)`,
      serverLog.trim().slice(-1200),
    );
  }
  console.log(`  preview on ${base}`);

  // --- CDP -------------------------------------------------------------------
  const profile = mkdtempSync(join(os.tmpdir(), `tv-scrollbar-${app.name}-`));
  const browser = spawn(
    chromePath,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-proxy-server",
      "--disable-gpu",
      "--window-size=1200,900",
      "about:blank",
    ],
    { stdio: "ignore", detached: true },
  );
  browser.unref();
  teardown.push(() => browser.kill());

  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 80; i++) {
    if (existsSync(portFile)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!existsSync(portFile)) fail("headless Chromium did not expose a CDP endpoint");

  const [cdpPort, browserPath = "/devtools/browser"] = (await readFile(portFile, "utf8"))
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
      for (const l of listeners) l(raw);
    });
    const send = (method, params = {}, sessionId) =>
      new Promise((res, rej) => {
        const i = ++id;
        pending.set(i, { resolve: res, reject: rej });
        ws.send(
          JSON.stringify(sessionId ? { sessionId, id: i, method, params } : { id: i, method, params }),
        );
      });
    ws.on("open", () => resolve({ send, on: (h) => listeners.add(h), off: (h) => listeners.delete(h) }));
    ws.on("error", reject);
  });

  const pageIssues = [];
  cdp.on((raw) => {
    const m = JSON.parse(raw);
    if (m.method === "Runtime.consoleAPICalled") {
      const { type, args } = m.params;
      if (type !== "error" && type !== "warning") return;
      const text = args.map((a) => a.value ?? a.description ?? "").join(" ").trim();
      if (!text || /favicon|net::ERR_|Download the React DevTools/i.test(text)) return;
      pageIssues.push(`[console.${type}] ${text.slice(0, 200)}`);
    }
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      const text = String(d.exception?.description ?? d.text ?? "unknown");
      if (/favicon|net::ERR_/i.test(text)) return;
      pageIssues.push(`[pageerror] ${text.slice(0, 200)}`);
    }
  });

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Network.clearBrowserCookies");

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) {
      fail(
        `${app.name}: evaluating a step threw`,
        String(exceptionDetails.exception?.description ?? exceptionDetails.text).slice(0, 600),
      );
    }
    return result.value;
  };

  const settle = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * A full page load, waiting for the load event.
   *
   * @remarks
   * `Page.navigate` rather than assigning `location.href`: the latter returns
   * before the new document commits, so the first evaluation can land in the
   * old execution context.
   */
  const goto = async (url) => {
    const loaded = new Promise((resolve) => {
      const handler = (raw) => {
        if (JSON.parse(raw).method === "Page.loadEventFired") {
          cdp.off(handler);
          resolve();
        }
      };
      cdp.on(handler);
    });
    await send("Page.navigate", { url });
    await loaded;
    await settle(1200);
  };

  const reload = async () => {
    const loaded = new Promise((resolve) => {
      const handler = (raw) => {
        if (JSON.parse(raw).method === "Page.loadEventFired") {
          cdp.off(handler);
          resolve();
        }
      };
      cdp.on(handler);
    });
    await send("Page.reload", { ignoreCache: true });
    await loaded;
    await settle(1200);
  };

  let passed = 0;
  const failures = [];
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
  const expectTrue = (label, actual) => expect(label, Boolean(actual), true);

  // --- 1. cold load, no interaction ---------------------------------------
  await goto(`${base}/`);
  let s = await evaluate(PROBE);
  const initialTheme = s.theme;

  expect("cold load: path", s.path, "/");
  expect("cold load: the page scrolls (the fixture is usable)", s.scrollable, true);
  expectTrue("cold load: <html> has the hiding class", s.hidingClass);
  expect("cold load: the native scrollbar is hidden", s.nativeWidth, "none");
  // The bug, stated as an assertion: rails must exist *now*, before any
  // interaction, not after the first theme change.
  expectTrue("cold load: overlay rails exist with no theme change", s.rails > 0);
  expectTrue("cold load: the vertical rail is drawn", s.railHeight > 0);
  expectTrue("cold load: the rail is visible", s.railVisible);
  expectTrue("cold load: the thumb is sized", s.thumbHeight > 0);
  expectTrue("cold load: the manager reached its ready phase", s.ready);
  expect("cold load: the theme is the server-rendered one", s.theme, themeOf(fallbackFamily, "light"));
  expect("cold load: no interaction changed the theme", s.theme, initialTheme);
  if (app.hasIsland) {
    expect("cold load: the island hydrated", s.islands[0], true);
  }

  // --- 2. scrolling tracks -------------------------------------------------
  const thumbBefore = s.thumbTop;
  const scrollA = await evaluate(scrollToFraction(0.3));
  await settle(400);
  s = await evaluate(PROBE);
  expectTrue("scroll: the document actually moved", scrollA > 0);
  expectTrue("scroll: the thumb moved with it", s.thumbTop !== thumbBefore);
  const thumbAfterScroll = s.thumbTop;

  // --- 3. a theme change updates appearance, it does not initialize --------
  const railsBefore = s.rails;
  const colorBefore = s.thumbColor;
  const marked = await evaluate(MARK_RAILS);
  expect("theme change: rails marked", marked, railsBefore);

  const clicked = await evaluate(app.toggle());
  if (clicked?.error) fail(`${app.name}: could not toggle the theme: ${clicked.error}`);
  await settle(700);
  s = await evaluate(PROBE);

  expect("theme change: the theme moved", s.theme, themeOf(fallbackFamily, "dark"));
  expect("theme change: the rail count is unchanged", s.rails, railsBefore);
  expectTrue("theme change: the manager was not rebuilt", s.marked);
  expectTrue("theme change: the rail is still drawn", s.railHeight > 0);
  expectTrue("theme change: the rail re-coloured", s.thumbColor !== colorBefore);
  // Scrolling still works after the change.
  const scrollB = await evaluate(scrollToFraction(0.9));
  await settle(350);
  s = await evaluate(PROBE);
  expectTrue("theme change: the page scrolled further", scrollB > scrollA);
  expectTrue("theme change: the thumb still tracks", s.thumbTop !== thumbAfterScroll);

  // --- 4. refresh restores ------------------------------------------------
  await reload();
  s = await evaluate(PROBE);
  expect("refresh: path", s.path, "/");
  expectTrue("refresh: rails are back", s.rails > 0);
  expectTrue("refresh: the rail is drawn", s.railHeight > 0);
  expect("refresh: the native scrollbar is hidden", s.nativeWidth, "none");
  expectTrue("refresh: the manager reached its ready phase", s.ready);
  // Persistence is not what this gate fixes, but a refresh that lost the theme
  // would make the next assertion meaningless.
  expect("refresh: the selected theme persisted", s.theme, themeOf(fallbackFamily, "dark"));

  // --- 5. the opposite initial theme --------------------------------------
  // Cold session again: the cookie is the only state, so the document is
  // server-rendered from `dark` rather than corrected into it.
  await send("Network.clearBrowserCookies");
  await send("Network.setCookie", {
    name: "theme-family",
    value: fallbackFamily,
    domain: "127.0.0.1",
    path: "/",
  });
  await send("Network.setCookie", {
    name: "theme-mode",
    value: "dark",
    domain: "127.0.0.1",
    path: "/",
  });
  await goto(`${base}/`);
  s = await evaluate(PROBE);
  expect("dark start: the theme is the dark variant", s.theme, themeOf(fallbackFamily, "dark"));
  expectTrue("dark start: rails exist with no theme change", s.rails > 0);
  expectTrue("dark start: the rail is drawn", s.railHeight > 0);
  expectTrue("dark start: the manager reached its ready phase", s.ready);
  expect("dark start: the native scrollbar is hidden", s.nativeWidth, "none");

  // Toggling back to light must behave the same way.
  const back = await evaluate(app.toggle());
  if (back?.error) fail(`${app.name}: could not toggle from the dark start: ${back.error}`);
  await settle(700);
  s = await evaluate(PROBE);
  expect("dark start: toggling reaches the light variant", s.theme, themeOf(fallbackFamily, "light"));
  expectTrue("dark start: the rail survives the toggle", s.railHeight > 0);

  // --- 6. removing the overlay gives the native scrollbar back -------------
  // The provider server-renders the hiding, so it outlives the component
  // unless something takes it back. That asymmetry used to leave a page in the
  // worst possible state: native bar hidden, no overlay drawing, no scrollbar
  // at all. Removing the element must restore the platform's scrollbar.
  const removed = await evaluate(`(() => {
    const el = document.querySelector('themvora-scrollbar');
    if (!el) return { error: 'no <themvora-scrollbar> in the document' };
    el.remove();
    return true;
  })()`);
  if (removed?.error) fail(`${app.name}: ${removed.error}`);
  await settle(400);
  s = await evaluate(PROBE);
  expect("teardown: the hiding class is gone", s.hidingClass, false);
  expect("teardown: the native scrollbar is back", s.nativeWidth !== "none", true);
  expect("teardown: the rails are gone", s.rails, 0);
  expect("teardown: the ready marker is gone", s.ready, false);

  if (pageIssues.length) {
    console.log(`  ${pageIssues.length} console error/warning(s):`);
    for (const i of pageIssues.slice(0, 8)) console.log(`     ${i}`);
    failures.push(`${pageIssues.length} console error/warning(s)`);
  }

  await send("Browser.close").catch(() => {});
  return { passed, failures };
}

async function main() {
  console.log("\n=== ASTRO SCROLLBAR INITIALIZATION GATE ===\n");

  assertNodeVersion();

  const selected = APPS.filter((app) => !appFilter || app.name === appFilter);
  if (!selected.length) {
    fail(`no app matches --app ${appFilter}`, `Known apps: ${APPS.map((a) => a.name).join(", ")}`);
  }

  const chromePath = findChrome();
  if (!chromePath) {
    fail(
      "headless Chromium not found",
      "Install Playwright's Chromium, or point THEMVORA_CHROME at a chrome.exe.",
    );
  }

  const wsPath = findWs();
  const require = createRequire(import.meta.url);
  const WebSocket = wsPath ? require(wsPath) : globalThis.WebSocket;
  if (!WebSocket) {
    fail(
      "no WebSocket implementation available",
      "Install `ws`, or run on a Node version that provides a global WebSocket.",
    );
  }

  let totalPassed = 0;
  const allFailures = [];
  for (const app of selected) {
    const { passed, failures } = await runApp(app, chromePath, WebSocket);
    totalPassed += passed;
    allFailures.push(...failures.map((f) => `${app.name}: ${f}`));
    console.log(
      `  ${failures.length === 0 ? "PASS" : "FAIL"}  ${app.name}: ${passed} assertions, ${failures.length} failed`,
    );
  }

  console.log(`\n  assertions: ${totalPassed}, failures: ${allFailures.length}`);
  for (const f of allFailures) console.log(`\n  ✗ ${f}`);
  return allFailures.length ? 1 : 0;
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
