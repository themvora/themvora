#!/usr/bin/env node
/**
 * Audit H — docs-site browser smoke (docs-system brief, Audit H).
 *
 * Boots the built docs site (`next start` — run `npm run build` in apps/docs
 * first), drives headless Chromium over the CDP protocol, and checks every
 * DOCS_ROUTES page for:
 *   - HTTP 200 (a listed route that 404s means IA/route drift),
 *   - no console errors and no uncaught page exceptions after hydration,
 *   - non-empty rendered text.
 *
 * Content spot-checks enforce Audit F / §6.4 guarantees in a real browser:
 *   - /api-reference/* pages render their package name and the generated
 *     "Related docs" capability backlink section;
 *   - framework pages use the mode vocabulary ("Pick the mode:"), never
 *     variant ("Pick the variant:").
 *
 * ## Why this runs in batches
 *
 * The walk used to run all 170 routes against one server and one page. It died
 * at ~164/170, and the failure was not the browser: the renderer's JS heap sat
 * flat at 33–162 MB for the whole run, while the *server* grew without bound
 * and aborted with `FATAL ERROR: Ineffective mark-compacts near heap limit` at
 * the 4 GB default. Measured on a plain fetch walk with no browser at all, RSS
 * climbs 567 MB → 2,526 MB across the 170 routes — about 11.5 MB retained per
 * rendered route. Browsing makes it worse because Next prefetches the links on
 * each page, so one visit costs several renders, and the ceiling arrives at
 * ~165 routes.
 *
 * The growth is a property of the docs app, not of this audit, and fixing it
 * would mean changing how the site renders. What the audit owns is that it must
 * not depend on a server outliving 170 renders. So the walk is split into
 * bounded batches, each with a fresh server and a fresh browser: memory starts
 * from zero every batch and cannot reach the ceiling. Every route is still
 * visited, every assertion is unchanged, and no timeout is loosened.
 *
 * The page is recreated when a navigation fails. A timed-out navigation leaves
 * the target mid-load; reusing it is what turned one hung route into five
 * "fetch failed" results.
 *
 * Infrastructure-skip: when headless Chromium or the `ws` CDP transport is
 * unavailable the audit reports SKIP and exits 0 (browser checks are best-
 * effort on machines without the toolchain); pass --strict to fail instead.
 *
 * Usage: node scripts/docs/audits/audit-browser-smoke.mjs [--strict]
 * Requires: apps/docs/.next build (a `next start` server), Chromium, ws.
 */

import { spawn, execFileSync } from "node:child_process";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
// Overridable so the memory guard below can be exercised against an isolated
// build of the same app without touching the checked-out tree.
const siteRoot = process.env.THEMVORA_DOCS_SITE ?? join(repoRoot, "apps", "docs");
const strict = process.argv.includes("--strict");

/**
 * Routes per server/browser generation.
 *
 * 40 keeps the worst-case server heap near 0.7 GB (40 × ~11.5 MB × the
 * prefetch amplification measured at ~1.6×), well under the 4 GB default that
 * the unbounded walk hit. Raising it trades safety margin for fewer restarts;
 * lowering it costs a server and browser boot per batch.
 */
const BATCH_SIZE = 40;
/** Every CDP command gets a deadline; a hung command names its route. */
const CMD_TIMEOUT_MS = 30000;
const NAV_TIMEOUT_MS = 45000;
const FETCH_TIMEOUT_MS = 20000;

/**
 * Memory guard: retained bytes per rendered route, measured with plain HTTP
 * requests and no browser.
 *
 * The docs server used to retain ~13.5 MB per render — it rebuilt the whole
 * search index on every request — and died at its heap limit around route 165.
 * Batching hides that from the walk itself, because each batch starts from
 * zero, so the retained cost is measured separately.
 *
 * The measurement deliberately excludes the browser. A browser multiplies the
 * server renders behind each visited route (Next prefetches the links on every
 * page), which pushes the figure to 12–15 MB/route for *both* the leaking and
 * the fixed server — too close to separate. Plain requests isolate the app's
 * own per-render cost, where the two are ~13.5 and ~5.9 MB.
 *
 * 9 MB/route sits between them with room on both sides for GC timing.
 */
const MAX_RETAINED_MB_PER_ROUTE = Number(process.env.THEMVORA_MAX_RETAINED_MB_PER_ROUTE ?? 9);
/** Routes used for the retention measurement; enough to average out GC noise. */
const RETENTION_PROBE_ROUTES = 40;

const failures = [];
const fail = (where, detail) => failures.push({ where, detail });

function skip(msg) {
  console.log(`\n=== AUDIT H — BROWSER SMOKE ===\n\n  SKIP — ${msg}\n`);
  if (strict) {
    console.log("--strict: treating skip as a failure.");
    // `process.exit(0)` would override `process.exitCode`, so exit explicitly
    // with the failing code — otherwise `--strict` would silently pass.
    process.exit(1);
  }
  process.exit(0);
}

// --- Locate headless Chromium (Playwright cache or THEMVORA_CHROME) --------
function findChrome() {
  if (process.env.THEMVORA_CHROME && existsSync(process.env.THEMVORA_CHROME)) {
    return process.env.THEMVORA_CHROME;
  }
  const pwRoot = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "ms-playwright")
    : join(os.homedir(), "AppData", "Local", "ms-playwright");
  if (!existsSync(pwRoot)) return null;
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
  return null;
}

// --- Locate the `ws` CDP transport (pnpm store or hoisted node_modules) -----
function findWs() {
  const candidates = [];
  const nm = join(repoRoot, "node_modules");
  const pnpm = join(nm, ".pnpm");
  if (existsSync(pnpm)) {
    for (const d of readdirSync(pnpm)) {
      if (/^ws@\d+\.\d+\.\d+$/.test(d)) candidates.push(join(pnpm, d, "node_modules", "ws"));
    }
  }
  candidates.sort((a, b) => b.localeCompare(a)); // newest version first
  if (existsSync(join(nm, "ws"))) candidates.unshift(join(nm, "ws"));
  for (const c of candidates) {
    if (existsSync(join(c, "package.json"))) return c;
  }
  return null;
}

const chrome = findChrome();
const wsPath = findWs();
if (!chrome) skip("headless Chromium not found (set THEMVORA_CHROME or install Playwright browsers)");
if (!wsPath) skip("the `ws` package is not installed (needed for the CDP transport)");

const { default: WebSocket } = await import(`file://${wsPath.replaceAll("\\", "/")}/index.js`);

// --- Collect the routes to smoke --------------------------------------------
const routesSrc = readFileSync(join(siteRoot, "lib", "docs-routes.ts"), "utf8");
const docsRoutes = [...routesSrc.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);

// Generated API-reference pages are not individually listed in DOCS_ROUTES
// (only the index is); enumerate them from the generated content tree so the
// smoke loop covers every generated page too.
function generatedApiRoutes() {
  const out = [];
  const base = join(siteRoot, "content", "api-reference");
  const walk = (dir, prefix) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${prefix}/${e.name}`);
      else if (e.name.endsWith(".md")) out.push(`/api-reference${prefix}/${e.name.replace(/\.md$/, "")}`);
    }
  };
  walk(base, "");
  return out;
}
const apiRefRoutes = generatedApiRoutes();
const allRoutes = [...new Set([...docsRoutes, ...apiRefRoutes])];

const apiSlug = (route) => route.split("/")[2]; // /api-reference/react → "react"

// --- Boot the built site -----------------------------------------------------
if (!existsSync(join(siteRoot, ".next", "BUILD_ID"))) {
  skip("apps/docs/.next build not found — run `npm run build` in apps/docs first");
}

const port = 32123;
const baseUrl = `http://localhost:${port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Reject rather than hang: every CDP call and every wait gets a deadline. */
function withDeadline(promise, ms, label) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

// --- Server generation -------------------------------------------------------
/**
 * Start one `next start` generation.
 *
 * Batches need a server that starts from zero heap, so this is a factory rather
 * than a single spawn. `stop()` is idempotent and awaited by the batch loop so
 * a restart cannot race the previous process for the port.
 */
function startServer() {
  const proc = spawn(
    process.execPath,
    [join(siteRoot, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
    { cwd: siteRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
  let log = "";
  proc.stdout.on("data", (d) => (log += d));
  proc.stderr.on("data", (d) => (log += d));
  let exited = null;
  proc.on("exit", (code, signal) => (exited = `${code}/${signal}`));

  return {
    proc,
    get log() {
      return log;
    },
    get exited() {
      return exited;
    },
    async stop() {
      if (proc.exitCode === null && !proc.killed) proc.kill();
      // Wait for the port to be released so the next generation can bind it.
      for (let i = 0; i < 40 && proc.exitCode === null; i++) await sleep(50);
    },
  };
}

async function waitForServer(generation) {
  for (let i = 0; i < 120; i++) {
    if (generation.exited) break;
    try {
      const res = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(
    `docs server did not become ready (exit ${generation.exited ?? "none"}).\n${generation.log.slice(-2000)}`,
  );
}

/**
 * Resident set size of the docs server in MB, or `null` where the platform
 * offers no cheap way to read it. `null` disables the guard rather than failing
 * it: a missing measurement is not a memory regression.
 */
function readRssMb(pid) {
  if (!pid) return null;
  try {
    if (process.platform === "linux") {
      const statm = readFileSync(`/proc/${pid}/statm`, "utf8").trim().split(/\s+/);
      const pages = Number(statm[1]);
      return Number.isFinite(pages) ? Math.round((pages * 4096) / 1048576) : null;
    }
    if (process.platform === "darwin") {
      const out = execFileSync("ps", ["-o", "rss=", "-p", String(pid)], { encoding: "utf8" });
      const kb = Number(out.trim());
      return Number.isFinite(kb) ? Math.round(kb / 1024) : null;
    }
    if (process.platform === "win32") {
      const out = execFileSync(
        "powershell",
        ["-NoProfile", "-NonInteractive", "-Command", `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).WorkingSet64`],
        { encoding: "utf8", timeout: 15000 },
      );
      const bytes = Number(out.trim());
      return Number.isFinite(bytes) && bytes > 0 ? Math.round(bytes / 1048576) : null;
    }
  } catch {
    return null;
  }
  return null;
}

// --- Browser generation ------------------------------------------------------
function cdpConnect(cdpPort, browserPath) {
  return new Promise((resolveCdp, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${cdpPort}${browserPath}`, { maxPayload: 256 * 1024 * 1024 });
    let id = 0;
    const pending = new Map();
    const listeners = new Set();
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
      for (const l of listeners) l(raw);
    });
    const send = (method, params = {}, sessionId) =>
      withDeadline(
        new Promise((res, rej) => {
          const msgId = ++id;
          pending.set(msgId, { resolve: res, reject: rej });
          ws.send(JSON.stringify(sessionId ? { sessionId, id: msgId, method, params } : { id: msgId, method, params }));
        }),
        CMD_TIMEOUT_MS,
        `CDP ${method}`,
      );
    ws.on("open", () =>
      resolveCdp({
        send,
        on: (h) => listeners.add(h),
        off: (h) => listeners.delete(h),
        close: () => {
          try {
            ws.close();
          } catch {}
        },
      }),
    );
    ws.on("error", reject);
  });
}

/**
 * Launch one browser generation and attach a single page to it.
 *
 * `openPage()` is separate from the browser so a failed navigation can throw
 * the page away and get a clean one without paying for a new browser.
 */
async function launchBrowser() {
  // Detached Chrome: --user-data-dir makes it write DevToolsActivePort (host
  // port on line 1) — the reliable way to learn the ephemeral CDP endpoint.
  const profileDir = join(os.tmpdir(), `tv-audit-h-${process.pid}-${Date.now()}`);
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore", detached: true },
  );
  child.unref();

  const portFile = join(profileDir, "DevToolsActivePort");
  for (let i = 0; i < 80; i++) {
    if (existsSync(portFile)) break;
    await sleep(250);
  }
  if (!existsSync(portFile)) throw new Error("headless Chromium did not expose a CDP endpoint (DevToolsActivePort missing)");
  const [cdpPortStr, browserPath = "/devtools/browser"] = readFileSync(portFile, "utf8")
    .split("\n")
    .map((s) => s.trim());

  const cdp = await cdpConnect(Number(cdpPortStr), browserPath);
  return {
    cdp,
    async close() {
      await cdp.send("Browser.close").catch(() => {});
      cdp.close();
      // Detached + unref'd, so nothing else reaps it if Browser.close fails.
      try {
        child.kill();
      } catch {}
    },
  };
}

/** Attach a fresh page target; the caller must `close()` it. */
async function openPage(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Log.enable").catch(() => {});
  return {
    send,
    async close() {
      // Detach first: closing a target with a live session can leave the
      // session emitting into a gone target on some Chromium builds.
      await cdp.send("Target.detachFromTarget", { sessionId }).catch(() => {});
      await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
    },
  };
}

/** Resolves with the params of the next CDP `method` event (or times out). */
function waitForEvent(cdp, method, timeoutMs) {
  return new Promise((resolveEvt, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      cdp.off(handler);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timeout waiting for ${method}`));
    }, timeoutMs);
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.method === method) {
        cleanup();
        resolveEvt(msg.params);
      }
    };
    cdp.on(handler);
  });
}

/** Navigate, wait for load + hydration settle, return console/page errors. */
async function visit(cdp, page, url) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
      consoleErrors.push(msg.params.args?.map((a) => a.value ?? a.description ?? "").join(" "));
    }
    if (msg.method === "Log.entryAdded" && msg.params?.entry?.level === "error") {
      consoleErrors.push(String(msg.params.entry.text ?? ""));
    }
    if (msg.method === "Runtime.exceptionThrown") {
      pageErrors.push(
        msg.params?.exceptionDetails?.exception?.description ?? msg.params?.exceptionDetails?.text ?? "exception",
      );
    }
  };
  cdp.on(onConsole);
  try {
    // Registered before navigate so the event cannot be missed, and cleaned up
    // in `finally` so a failed navigation leaves no listener or timer behind.
    const loaded = waitForEvent(cdp, "Page.loadEventFired", NAV_TIMEOUT_MS);
    try {
      await page.send("Page.navigate", { url });
      await loaded;
    } catch (e) {
      // The navigation promise rejects on its own timeout; make sure the
      // companion event wait cannot surface as an unhandled rejection.
      loaded.catch(() => {});
      throw e;
    }
    // Allow hydration to settle and lazy errors to surface.
    await sleep(1200);
    const { result } = await page.send("Runtime.evaluate", {
      expression: "document.body.innerText.length",
      returnByValue: true,
    });
    return { textLength: Number(result.value ?? 0), consoleErrors, pageErrors };
  } finally {
    cdp.off(onConsole);
  }
}

// --- Main flow ---------------------------------------------------------------
console.log("\n=== AUDIT H — BROWSER SMOKE ===\n");
console.log(`Routes to check: ${allRoutes.length} (${apiRefRoutes.length} API-reference pages)`);
console.log(`Batches: ${Math.ceil(allRoutes.length / BATCH_SIZE)} of ≤${BATCH_SIZE} routes (fresh server + browser per batch)\n`);

let checked = 0;
let index = 0;
let batches = 0;
const startedAt = Date.now();

/**
 * `--retention-only` runs just the memory probe. It exists so the guard can be
 * exercised (and a regression reproduced) in seconds instead of after a
 * six-minute walk.
 */
const retentionOnly = process.argv.includes("--retention-only");

for (let start = 0; !retentionOnly && start < allRoutes.length; start += BATCH_SIZE) {
  const batchRoutes = allRoutes.slice(start, start + BATCH_SIZE);
  const isLastBatch = start + BATCH_SIZE >= allRoutes.length;
  batches += 1;

  const generation = startServer();
  let browser = null;
  let memNote = "";
  try {
    await waitForServer(generation);
    browser = await launchBrowser();
    let page = await openPage(browser.cdp);
    const rssStart = readRssMb(generation.proc.pid);

    for (const route of batchRoutes) {
      index += 1;
      if (index % 10 === 0 || index === allRoutes.length) {
        console.log(`  … ${index}/${allRoutes.length}  (at ${route})`);
      }
      const url = `${baseUrl}${route}`;

      // A dead server would otherwise surface as 40 identical "fetch failed"
      // results; name the real cause once instead.
      if (generation.exited) {
        fail(route, `docs server exited (${generation.exited}) before this route — see the server log`);
        break;
      }

      let res = null;
      try {
        res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      } catch {
        res = null;
      }
      if (!res || res.status !== 200) {
        fail(route, `HTTP ${res ? res.status : "fetch failed"} — route listed in docs-routes.ts does not render`);
        continue;
      }

      let textLength, consoleErrors, pageErrors;
      try {
        ({ textLength, consoleErrors, pageErrors } = await visit(browser.cdp, page, url));
      } catch (e) {
        // Name the route rather than letting the CDP timeout escape as a bare stack.
        fail(route, `navigation failed: ${String(e && e.message ? e.message : e)}`);
        // The target is mid-load and cannot be trusted for the next route.
        await page.close();
        page = await openPage(browser.cdp);
        continue;
      }
      checked += 1;
      if (textLength === 0) fail(route, "page rendered empty (no text content after hydration)");
      for (const e of consoleErrors) fail(route, `console error: ${String(e).slice(0, 220)}`);
      for (const e of pageErrors) fail(route, `uncaught exception: ${String(e).slice(0, 220)}`);

      // Content spot-check: generated API pages must expose the package and the
      // §6.4 capability backlinks (Audit F guarantee + generated section).
      if (route.startsWith("/api-reference/")) {
        const { result } = await page.send("Runtime.evaluate", {
          expression: "document.body.innerText",
          returnByValue: true,
        });
        const text = String(result.value ?? "");
        const slug = apiSlug(route);
        if (!text.includes(`@themvora/${slug}`)) {
          fail(route, `API page does not mention its package (@themvora/${slug})`);
        }
        if (!text.includes("Related docs")) {
          fail(route, 'generated "Related docs" capability section missing');
        }
      }
    }

    // Per-batch RSS is reported for diagnosis, not asserted: with a browser in
    // the loop the figure is dominated by prefetch-driven extra renders, so it
    // cannot separate an app regression from framework work. The asserted
    // measurement is the plain-request probe below.
    const rssEnd = readRssMb(generation.proc.pid);
    if (rssStart !== null && rssEnd !== null && batchRoutes.length > 0) {
      memNote = ` | rss ${rssStart}→${rssEnd} MB`;
    }

    // Mode-vocabulary spot-check on a framework page (root-fix verification).
    // Runs inside the last batch's live server and browser, so it needs no
    // generation of its own.
    if (isLastBatch) {
      const fwUrl = `${baseUrl}/framework-guides/react`;
      const fwRes = await fetch(fwUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
      if (fwRes?.ok) {
        await visit(browser.cdp, page, fwUrl);
        const { result } = await page.send("Runtime.evaluate", {
          expression: "document.body.innerText",
          returnByValue: true,
        });
        const hydrated = String(result.value ?? "");
        if (/Pick the variant:/.test(hydrated)) {
          fail("/framework-guides/react (mode vocabulary)", 'page still renders "Pick the variant:"');
        }
      }
    }

    await page.close();
  } finally {
    if (browser) await browser.close();
    await generation.stop();
  }
  console.log(
    `  — batch ${batches} done (${Math.min(start + BATCH_SIZE, allRoutes.length)}/${allRoutes.length})${memNote}`,
  );
}

// --- retained-memory probe ---------------------------------------------------
// A fresh server, plain requests, no browser. This is the app's own per-render
// retention — the number that used to grow without bound — measured away from
// the prefetch amplification a browser adds.
{
  const probeRoutes = allRoutes.slice(0, Math.min(RETENTION_PROBE_ROUTES, allRoutes.length));
  const generation = startServer();
  try {
    await waitForServer(generation);
    const before = readRssMb(generation.proc.pid);
    let served = 0;
    for (const route of probeRoutes) {
      try {
        const res = await fetch(`${baseUrl}${route}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        await res.text();
        served += 1;
      } catch {
        break;
      }
    }
    await sleep(1500);
    const after = readRssMb(generation.proc.pid);
    if (before !== null && after !== null && served > 0) {
      const perRoute = (after - before) / served;
      console.log(
        `\n  retained memory: ${before}→${after} MB over ${served} plain renders ` +
          `(${perRoute.toFixed(1)} MB/route, ceiling ${MAX_RETAINED_MB_PER_ROUTE})`,
      );
      if (perRoute > MAX_RETAINED_MB_PER_ROUTE) {
        fail(
          "memory (per-render retention)",
          `the docs server retained ${after - before} MB over ${served} plain renders ` +
            `(${perRoute.toFixed(1)} MB/route, ceiling ${MAX_RETAINED_MB_PER_ROUTE}). ` +
            `Per-request retention is growing again — see the memory section of the audit report.`,
        );
      }
    } else {
      console.log(`\n  retained memory: not measurable on ${process.platform} (guard skipped)`);
    }
  } finally {
    await generation.stop();
  }
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\nChecked ${checked}/${allRoutes.length} routes in a real browser.`);
console.log(`Batches: ${batches}. Wall clock: ${elapsed}s.`);
for (const f of failures) {
  console.log(`\n  ✗ ${f.where}\n      ${f.detail}`);
}
console.log(`\nFailures: ${failures.length}`);
process.exitCode = failures.length ? 1 : 0;
