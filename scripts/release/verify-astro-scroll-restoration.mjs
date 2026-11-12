#!/usr/bin/env node
/**
 * First-paint scroll-restoration gate for Astro.
 *
 * ## The bug this pins
 *
 * `<ClientRouter />` saves the scroll position into `history.state` and sets
 * `history.scrollRestoration = "manual"`. It restores the position from its
 * **deferred module**, which runs after the document has been parsed and,
 * whenever that module is slow (dev's module graph, a throttled network), after
 * the first paint. The first frame is therefore at `scrollY === 0` and the page
 * jumps to the saved position afterwards.
 *
 * A plain `window.load` + `scrollY > 0` check cannot see this: by then the
 * router has already restored. The gate samples from document-start (rAF and
 * paint timings) and, crucially, throttles CPU and network so the window
 * between "the document is tall enough to show the target frame" and "the
 * router module runs" is wide enough to observe. Without that throttle the
 * buggy and fixed documents both pass.
 *
 * ## What is asserted
 *
 * For every Themvora page that the fixture renders, after a real reload from
 * the middle and from the bottom:
 *
 *   - the document ends at the saved position;
 *   - after the first paint, **no sampled frame that is tall enough to reach
 *     the saved position is at the top**. That is the visible flash, stated as
 *     a frame property rather than as a timing guess.
 *
 * It also checks that ordinary navigation is not handed an old position, that
 * back/forward still restores, and that Astro client-side navigation still
 * works.
 *
 * The plain-Astro pages are controls: they show the router's own behaviour and
 * are asserted only on their final position. Themvora does not own the
 * platform document there.
 *
 * ## Fixture layout
 *
 * `examples/apps/astro-react/scroll-fixture.config.mjs` builds an isolated set
 * of exercise pages (`srcDir`/`outDir` of its own), so the demo pages are not
 * affected. The two real examples are built and previewed as well — the
 * acceptance criterion is a production build of the shipped apps.
 *
 * ## No skip path
 *
 * A missing browser, a failed build, a server that does not start, or a failed
 * assertion all exit non-zero with an actionable message.
 *
 * Usage:
 *   node scripts/release/verify-astro-scroll-restoration.mjs
 *   node scripts/release/verify-astro-scroll-restoration.mjs --skip-build
 *   node scripts/release/verify-astro-scroll-restoration.mjs --app fixture
 *
 * Requires Node >= 22.23.4 and a headless Chromium — Playwright's, or
 * `THEMVORA_CHROME`.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
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

const MIN_NODE = [22, 23, 4];
const REACT_APP = join(repoRoot, "examples", "apps", "astro-react");
const NATIVE_APP = join(repoRoot, "examples", "apps", "astro-native");
const FIXTURE_CONFIG = "scroll-fixture.config.mjs";

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
    const nix = join(pwRoot, d, "chrome-linux", "chrome");
    if (existsSync(nix)) return nix;
  }
  return null;
}

function findWs() {
  try {
    return createRequire(import.meta.url).resolve("ws");
  } catch {
    // Node 22+ has a global WebSocket.
  }
  return null;
}

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

function astroCli(appRoot) {
  const appRequire = createRequire(join(appRoot, "package.json"));
  try {
    const pkgPath = appRequire.resolve("astro/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.astro;
    return join(dirname(pkgPath), bin);
  } catch {
    return join(appRoot, "node_modules", "astro", "bin", "astro.mjs");
  }
}

/**
 * Samples scroll state from document-start on every new document.
 *
 * `requestAnimationFrame` callbacks run after the frame's tasks and before its
 * paint, so a sample describes what that frame would show. `h` is the document
 * height, which distinguishes "top of an empty document" (nothing to see) from
 * "top of the real, tall page" (the flash).
 */
const SAMPLER = `(() => {
  const samples = [];
  const rec = (phase) => {
    const de = document.documentElement;
    samples.push({
      phase,
      t: Math.round(performance.now() * 10) / 10,
      y: Math.round(window.scrollY),
      h: de ? de.scrollHeight : -1,
    });
  };
  rec("init");
  document.addEventListener("DOMContentLoaded", () => rec("dcl"));
  window.addEventListener("load", () => rec("load"));
  let n = 0;
  const loop = () => {
    rec("raf" + n);
    n += 1;
    if (n < 240) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__tvScrollSamples = samples;
})();`;

const READ_STATE = `(() => {
  const samples = window.__tvScrollSamples || [];
  const paints = performance.getEntriesByType("paint").map((p) => ({
    name: p.name,
    t: Math.round(p.startTime * 10) / 10,
  }));
  const firstPaint = paints.find((p) => p.name === "first-paint");
  const nav = performance.getEntriesByType("navigation")[0];
  return {
    samples,
    firstPaint: firstPaint ? firstPaint.t : 0,
    y: Math.round(window.scrollY),
    h: document.documentElement.scrollHeight,
    vh: window.innerHeight,
    state: history.state,
    restoration: history.scrollRestoration,
    nav: nav ? nav.type : "?",
    path: location.pathname,
  };
})()`;

const scrollTo = (fraction) => `(() => {
  const el = document.scrollingElement;
  const max = Math.max(0, el.scrollHeight - window.innerHeight);
  const y = Math.round(max * ${fraction});
  window.scrollTo({ top: y, behavior: "instant" });
  return { y, max };
})()`;

const TOLERANCE = 2;

function firstPaintOffenders({ samples, firstPaint, savedY, vh }) {
  // Only frames tall enough to reach the saved position matter: below that
  // height the browser must clamp, and a top-of-document sample is not the
  // visible "top content at scroll 0" flash.
  const tallEnough = savedY + vh;
  return samples.filter(
    (s) =>
      s.h >= tallEnough &&
      s.t >= firstPaint &&
      Math.abs(s.y - savedY) > TOLERANCE,
  );
}

const FIXTURE_ROUTES = [
  // Controls (no Themvora document): final position only.
  { path: "/plain/", strict: false, kind: "control" },
  { path: "/plain-no-router/", strict: false, kind: "control" },
  // Themvora document, router present — the reported configuration.
  { path: "/provider/", strict: true, kind: "provider+router" },
  { path: "/provider-scrollbar/", strict: true, kind: "provider+scrollbar+router" },
  { path: "/island/", strict: true, kind: "provider+island+router" },
  { path: "/island-scrollbar/", strict: true, kind: "provider+island+scrollbar+router" },
  // Themvora document without the router — native restoration stays in charge.
  { path: "/provider-no-router/", strict: true, kind: "provider" },
  { path: "/provider-scrollbar-no-router/", strict: true, kind: "provider+scrollbar" },
  { path: "/island-no-router/", strict: true, kind: "provider+island" },
  { path: "/island-scrollbar-no-router/", strict: true, kind: "provider+island+scrollbar" },
];

const TARGETS = [
  {
    name: "astro-native",
    app: NATIVE_APP,
    config: null,
    navigation: false,
    routes: [{ path: "/", strict: true, kind: "astro-native demo" }],
  },
  {
    name: "astro-react",
    app: REACT_APP,
    config: null,
    navigation: false,
    routes: [{ path: "/", strict: true, kind: "astro+react demo" }],
  },
  {
    name: "fixture",
    app: REACT_APP,
    config: FIXTURE_CONFIG,
    navigation: { other: "/other/", target: "/provider-scrollbar/" },
    routes: FIXTURE_ROUTES,
  },
];

function build(app, config) {
  const cli = astroCli(app);
  if (!existsSync(cli)) {
    fail(
      `the Astro CLI is missing for ${app} (looked for ${cli})`,
      "Install the workspace first.",
    );
  }
  const label = config ? `${app} (${config})` : app;
  console.log(`  astro build — ${label}`);
  const args = [cli, "build"];
  if (config) args.push("--config", config);
  const built = spawnSync(process.execPath, args, { cwd: app, encoding: "utf8" });
  if (built.status !== 0) {
    fail(
      `\`astro build\` failed in ${label} with exit code ${built.status}`,
      `${built.stdout ?? ""}${built.stderr ?? ""}`.trim().slice(-1500),
    );
  }
}

async function preview(app, config) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const args = ["preview", "--host", "127.0.0.1", "--port", String(port), "--ignore-lock"];
  if (config) args.push("--config", config);
  const server = spawn(process.execPath, [astroCli(app), ...args], {
    cwd: app,
    stdio: ["ignore", "pipe", "pipe"],
  });
  teardown.push(() => server.kill());
  let log = "";
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));

  const probePath = config ? FIXTURE_ROUTES[0].path : "/";
  for (let i = 0; i < 120; i += 1) {
    if (server.exitCode !== null) {
      fail(
        `\`astro preview\` exited early for ${app} with code ${server.exitCode}`,
        log.trim().slice(-1200),
      );
    }
    try {
      if ((await fetch(`${base}${probePath}`)).ok) return base;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  fail(`\`astro preview\` never started for ${app}`, log.trim().slice(-1200));
}

async function startBrowser(chromePath, name) {
  const profile = mkdtempSync(join(os.tmpdir(), `tv-scroll-${name}-`));
  const browser = spawn(
    chromePath,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-proxy-server",
      "--disable-gpu",
      "--disable-features=BackForwardCache",
      "--window-size=1200,900",
      "about:blank",
    ],
    { stdio: "ignore", detached: true },
  );
  browser.unref();
  teardown.push(() => browser.kill());

  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 80; i += 1) {
    if (existsSync(portFile)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!existsSync(portFile)) fail("headless Chromium did not expose a CDP endpoint");

  const [cdpPort, browserPath = "/devtools/browser"] = readFileSync(portFile, "utf8")
    .split("\n")
    .map((s) => s.trim());
  return `ws://127.0.0.1:${cdpPort}${browserPath}`;
}

async function connect(wsUrl, WebSocket) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    // The `ws` package exposes EventEmitter methods; Node's global WebSocket is
    // an EventTarget. Support both so the gate needs no extra dependency.
    const emitter = typeof ws.on === "function";
    const onMessage = (handler) => {
      if (emitter) ws.on("message", handler);
      else
        ws.addEventListener("message", (event) =>
          handler(typeof event.data === "string" ? event.data : Buffer.from(event.data).toString()),
        );
    };
    const onOpen = (handler) => {
      if (emitter) ws.on("open", handler);
      else ws.addEventListener("open", handler);
    };
    const onError = (handler) => {
      if (emitter) ws.on("error", handler);
      else ws.addEventListener("error", handler);
    };

    let id = 0;
    const pending = new Map();
    const listeners = new Set();
    onMessage((raw) => {
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
    onOpen(() =>
      resolve({ send, on: (h) => listeners.add(h), off: (h) => listeners.delete(h) }),
    );
    onError(reject);
  });
}

async function runTarget(target, chromePath, WebSocket, results) {
  console.log(`\n${"=".repeat(72)}\n  ${target.name}\n${"=".repeat(72)}`);

  if (!skipBuild) build(target.app, target.config);
  const base = await preview(target.app, target.config);
  console.log(`  preview on ${base}`);

  const cdp = await connect(await startBrowser(chromePath, target.name), WebSocket);
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

  // The reproduction window only exists when the router module is slower than
  // the first paint. Cache-busting alone is not enough; CPU + network pressure
  // is what makes the bug deterministic instead of a coin flip.
  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 250_000,
    uploadThroughput: 250_000,
  });
  await send("Emulation.setCPUThrottlingRate", { rate: 6 });

  await send("Page.addScriptToEvaluateOnNewDocument", { source: SAMPLER });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) {
      fail(
        `${target.name}: evaluating a step threw`,
        String(exceptionDetails.exception?.description ?? exceptionDetails.text).slice(0, 600),
      );
    }
    return result.value;
  };

  const settle = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitForLoad = () =>
    new Promise((resolve) => {
      const handler = (raw) => {
        if (JSON.parse(raw).method === "Page.loadEventFired") {
          cdp.off(handler);
          resolve();
        }
      };
      cdp.on(handler);
    });

  const goto = async (path) => {
    const loaded = waitForLoad();
    await send("Page.navigate", { url: `${base}${path}` });
    await loaded;
    await settle(1800);
  };

  const reload = async () => {
    const loaded = waitForLoad();
    await send("Page.reload", { ignoreCache: true });
    await loaded;
    await settle(1800);
  };

  /** Scrolls, lets Astro record the position in `history.state`, and reads it. */
  const scrollAndSave = async (fraction) => {
    const scrolled = await evaluate(scrollTo(fraction));
    await settle(700);
    const state = await evaluate(
      `({ y: Math.round(scrollY), state: history.state, restoration: history.scrollRestoration })`,
    );
    return { ...scrolled, ...state };
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
  const expectClose = (label, actual, wanted) => {
    if (Math.abs(actual - wanted) <= TOLERANCE) {
      passed += 1;
      return;
    }
    console.log(`  FAIL  ${label}`);
    console.log(`          expected ~${wanted} (±${TOLERANCE})`);
    console.log(`          actual   ${actual}`);
    failures.push(`${label} — expected ~${wanted}, got ${actual}`);
  };

  for (const route of target.routes) {
    for (const fraction of [0.5, 1.0]) {
      const where = `${route.kind} ${route.path} @${fraction === 1 ? "bottom" : "middle"}`;
      await goto(route.path);
      const saved = await scrollAndSave(fraction);
      if (!(saved.y > 0)) {
        fail(
          `${target.name}: the fixture did not scroll for ${where}`,
          `scrollY=${saved.y}. The page must be taller than the viewport before the reload is meaningful.`,
        );
      }

      await reload();
      const after = await evaluate(READ_STATE);
      const offenders = firstPaintOffenders({ ...after, savedY: saved.y });

      expectClose(`${where}: reload ends at the saved position`, after.y, saved.y);
      expect(`${where}: navigation type is a reload`, after.nav, "reload");
      if (route.strict) {
        if (offenders.length) {
          const first = offenders[0];
          console.log(
            `  FAIL  ${where}: painted the top before restoring (${offenders.length} frame(s), ` +
              `first at ${first.t}ms with first-paint ${after.firstPaint}ms)`,
          );
          failures.push(
            `${where} — ${offenders.length} post-paint frame(s) at y=${first.y}, expected ~${saved.y}`,
          );
        } else {
          passed += 1;
        }
      } else {
        console.log(
          `  note  ${where}: control (no Themvora document) — ` +
            `${offenders.length} post-paint top frame(s); final position checked only`,
        );
      }
    }
  }

  if (target.navigation) {
    const { other, target: navRoute } = target.navigation;

    // --- ordinary navigation is not handed an old position -----------------
    // The tall page's entry is scrolled, then a *fresh* navigation creates a
    // new entry with no state. The old entry's position must not travel.
    await goto(navRoute);
    const previous = await scrollAndSave(0.5);
    expectTrue("ordinary navigation: the previous entry was scrolled", previous.y > 0);
    await goto(other);
    const navigated = await (async () => {
      const loaded = waitForLoad();
      await send("Page.navigate", { url: `${base}${navRoute}` });
      await loaded;
      await settle(1800);
      return evaluate(READ_STATE);
    })();
    expect("ordinary navigation: the new document starts at the top", navigated.y, 0);
    expectTrue(
      "ordinary navigation: no early sample restored another entry's position",
      navigated.samples.every((s) => s.y === 0),
    );

    // --- back/forward still restores ---------------------------------------
    await goto(navRoute);
    const historySaved = await scrollAndSave(0.5);
    await goto(other);
    const backLoaded = waitForLoad();
    await evaluate("history.back()");
    await backLoaded;
    await settle(1800);
    const back = await evaluate(READ_STATE);
    expectClose("back/forward: the saved position is restored", back.y, historySaved.y);
    expectTrue("back/forward: history reports a traverse", back.nav === "back_forward");

    // --- Astro client-side navigation still works --------------------------
    await goto(other);
    const clicked = await evaluate(`(() => {
      const link = document.querySelector('a[href="${navRoute}"]');
      if (!link) return { error: "no fixture link" };
      link.click();
      return true;
    })()`);
    if (clicked?.error) fail(`${target.name}: ${clicked.error}`);
    let pathname = "";
    for (let i = 0; i < 60; i += 1) {
      pathname = await evaluate("location.pathname");
      if (pathname === navRoute) break;
      await settle(150);
    }
    await settle(800);
    expect("client-side navigation: the router reached the target path", pathname, navRoute);
    expect(
      "client-side navigation: the new page starts at the top",
      await evaluate("Math.round(scrollY)"),
      0,
    );
  }

  if (pageIssues.length) {
    console.log(`  ${pageIssues.length} console error/warning(s):`);
    for (const i of pageIssues.slice(0, 8)) console.log(`     ${i}`);
    failures.push(`${pageIssues.length} console error/warning(s)`);
  }

  await send("Browser.close").catch(() => {});
  results.passed += passed;
  results.failures.push(...failures.map((f) => `${target.name}: ${f}`));
  console.log(`  ${passed} passed, ${failures.length} failed`);
}

async function main() {
  console.log("\n=== ASTRO SCROLL RESTORATION GATE ===\n");

  assertNodeVersion();

  const selected = TARGETS.filter((t) => !appFilter || t.name === appFilter);
  if (!selected.length) {
    fail(
      `no target matches --app ${appFilter}`,
      `Known targets: ${TARGETS.map((t) => t.name).join(", ")}`,
    );
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

  const results = { passed: 0, failures: [] };
  try {
    for (const target of selected) {
      await runTarget(target, chromePath, WebSocket, results);
    }
  } finally {
    await shutdown();
  }

  console.log(`\n${"-".repeat(72)}`);
  console.log(`${results.passed} assertion(s) passed, ${results.failures.length} failed`);
  if (results.failures.length) {
    console.log("\nFailures:");
    for (const f of results.failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("First-frame scroll restoration holds.");
  }
}

main().catch(async (error) => {
  await shutdown();
  if (error instanceof GateError) {
    console.error(`\nFAIL: ${error.message}`);
    if (error.detail) console.error(`\n${error.detail}`);
  } else {
    console.error(`\nFAIL: ${error?.stack ?? error}`);
  }
  process.exitCode = 1;
});
