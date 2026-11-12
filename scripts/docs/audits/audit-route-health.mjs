#!/usr/bin/env node
/**
 * Audit — route health.
 *
 * Sends a real HTTP request to every canonical route and reports the things a
 * crawler timeout cannot distinguish:
 *
 *   - the route does not exist (404 / non-HTML)
 *   - the server response is slow (measured per route)
 *   - the HTML rendered but has no title, heading or application shell
 *   - the route unexpectedly redirects
 *
 * Redirect aliases are checked separately: the source must return a permanent
 * redirect to the canonical destination, and that destination must render.
 *
 * The server can be supplied with `--base-url` or started for the run with
 * `--start` (requires a prior `next build`). Routes run in bounded batches so a
 * single stuck page cannot exhaust the Node process; `--restart-every` restarts
 * the server between batches.
 *
 * Usage:
 *   node scripts/docs/audits/audit-route-health.mjs --base-url http://127.0.0.1:3000
 *   node scripts/docs/audits/audit-route-health.mjs --start
 */

import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { DOCS_ROUTES } from "../../../apps/docs/lib/docs-routes.ts";
import { REDIRECTS } from "../../../apps/docs/redirects.mjs";
import { SITE_URL } from "../../../apps/docs/lib/site.ts";
import { recipeData } from "../../../apps/docs/lib/recipes.ts";
import { apiPackages } from "../../../apps/docs/lib/api-reference.ts";

const URL = fileURLToPath(import.meta.url);
const repoRoot = join(dirname(dirname(dirname(dirname(URL)))));
const docsRoot = join(repoRoot, "apps/docs");

const port = Number(process.env.ROUTE_HEALTH_PORT ?? 3210);
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index !== -1 ? process.argv[index + 1] : fallback;
};
const baseUrl = arg("--base-url", `http://127.0.0.1:${port}`);
const shouldStart = process.argv.includes("--start");
const batchSize = Number(arg("--batch-size", "4"));
const restartEvery = Number(arg("--restart-every", "0"));
const requestTimeout = Number(arg("--timeout", "20000"));

const failures = [];
const rows = [];

function pageFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      pageFiles(full, out);
    } else if (entry.name === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

function toRoute(file) {
  const parts = relative(join(docsRoot, "app"), file).split(sep).slice(0, -1);
  return `/${parts
    .map((segment) => {
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return "*";
      if (/^\[.+\]$/.test(segment)) return ":";
      return segment;
    })
    .join("/")}`;
}

function standaloneRoutes() {
  const text = readFileSync(join(docsRoot, "app/sitemap.ts"), "utf8");
  const block = /const STANDALONE_ROUTES = \[([\s\S]*?)\] as const;/.exec(text);
  return block ? [...block[1].matchAll(/"(\/[^"]*)"/g)].map((m) => m[1]) : [];
}

const allStatic = new Set(pageFiles(join(docsRoot, "app")).map(toRoute));
const canonical = new Set();
for (const route of allStatic) {
  if (route.includes(":") || route.includes("*")) continue;
  canonical.add(route);
}
for (const route of DOCS_ROUTES) canonical.add(route.href);
for (const route of standaloneRoutes()) canonical.add(route);
for (const route of ["/blog", "/recipes", "/api-reference"]) canonical.add(route);

// Dynamic detail routes are enumerated from their own data, not guessed.
for (const id of Object.keys(recipeData)) canonical.add(`/recipes/${id}`);
for (const pkg of apiPackages) {
  canonical.add(`/api-reference/${pkg.slug}`);
  for (const submodule of pkg.submodules ?? []) {
    canonical.add(`/api-reference/${pkg.slug}/${submodule}`);
  }
}
for (const file of readdirSync(join(docsRoot, "content", "blog"))) {
  if (file.endsWith(".md")) canonical.add(`/blog/${file.slice(0, -3)}`);
}

const routes = [...canonical].sort();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/robots.txt`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return;
    } catch {
      /* not ready */
    }
    await sleep(1000);
  }
  throw new Error(`server at ${url} did not become ready within ${timeoutMs}ms`);
}

function startServer() {
  const nextBin = join(docsRoot, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(nextBin)) {
    throw new Error(`next binary not found at ${nextBin}; run pnpm install`);
  }
  if (!existsSync(join(docsRoot, ".next", "BUILD_ID"))) {
    throw new Error("no production build found; run `pnpm --filter @themvora/docs build` first");
  }
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: docsRoot,
    stdio: "ignore",
    env: { ...process.env, NODE_ENV: "production" },
    detached: process.platform !== "win32",
  });
  return child;
}

function stopServer(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

async function request(path, options = {}) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(requestTimeout),
      ...options,
    });
    const body = await response.text();
    return {
      status: response.status,
      location: response.headers.get("location"),
      contentType: response.headers.get("content-type") ?? "",
      body,
      ms: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      status: 0,
      error: error instanceof Error ? error.message : String(error),
      ms: Math.round(performance.now() - started),
    };
  }
}

function inspectHtml(body) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1]?.trim() ?? "";
  const h1 = /<h1[^>]*>/i.test(body);
  const shell = /<html[\s>]/i.test(body) && /id="main"/.test(body);
  return { title, h1, shell };
}

async function checkRoute(route) {
  const result = await request(route);
  const html = result.status === 200 ? inspectHtml(result.body) : { title: "", h1: false, shell: false };
  const ok =
    result.status === 200 &&
    result.contentType.includes("text/html") &&
    html.shell &&
    html.title.length > 0 &&
    html.h1;

  rows.push({
    route,
    status: result.status,
    ms: result.ms,
    html: result.status === 200,
    title: html.title,
    shell: html.shell,
    ok,
    error: result.error,
  });

  if (!ok) {
    const reason =
      result.error
        ? result.error
        : result.status !== 200
          ? `HTTP ${result.status}${result.location ? ` → ${result.location}` : ""}`
          : !result.contentType.includes("text/html")
            ? `content-type ${result.contentType}`
            : !html.shell
              ? "missing document shell"
              : !html.title
                ? "missing <title>"
                : "missing <h1>";
    failures.push(`${route}: ${reason} (${result.ms}ms)`);
  }
}

async function checkRedirects() {
  for (const rule of REDIRECTS) {
    const result = await request(rule.source);
    const expectedStatus = rule.permanent ? 308 : 307;
    const location = result.location
      ? result.location.replace(baseUrl, "")
      : "";
    if (result.status !== expectedStatus || location !== rule.destination) {
      failures.push(
        `${rule.source}: expected ${expectedStatus} ${rule.destination}, got ${result.status} ${location || "(no location)"}`,
      );
      continue;
    }
    const destination = await request(rule.destination);
    if (destination.status !== 200) {
      failures.push(
        `${rule.source}: destination ${rule.destination} returned ${destination.status}`,
      );
    }
  }
}

async function checkSeoEndpoints() {
  const robots = await request("/robots.txt");
  if (robots.status !== 200 || !robots.body.includes("/sitemap.xml")) {
    failures.push(`/robots.txt: status ${robots.status}, sitemap reference missing`);
  } else {
    if (!robots.contentType.includes("text/plain")) {
      failures.push(`/robots.txt: content-type ${robots.contentType}`);
    }
    if (!robots.body.includes(SITE_URL)) {
      failures.push(`/robots.txt: does not use the configured site origin ${SITE_URL}`);
    }
  }

  const sitemap = await request("/sitemap.xml");
  if (sitemap.status !== 200 || !sitemap.contentType.includes("xml")) {
    failures.push(`/sitemap.xml: status ${sitemap.status}, content-type ${sitemap.contentType}`);
  } else {
    for (const rule of REDIRECTS) {
      if (sitemap.body.includes(`>${SITE_URL}${rule.source}<`)) {
        failures.push(`/sitemap.xml: contains redirect alias ${rule.source}`);
      }
    }
    if (!sitemap.body.includes(SITE_URL)) {
      failures.push(`/sitemap.xml: does not use the configured site origin ${SITE_URL}`);
    }
    for (const match of sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const url = match[1];
      if (!url.startsWith(SITE_URL)) {
        failures.push(`/sitemap.xml: non-canonical origin ${url}`);
        continue;
      }
      const path = url.slice(SITE_URL.length) || "/";
      if (!canonical.has(path)) {
        failures.push(`/sitemap.xml: URL not in the canonical inventory: ${path}`);
      }
    }
  }
}

async function run() {
  let server = null;
  try {
    if (shouldStart) {
      server = startServer();
      await waitForServer(baseUrl);
    }

    console.log("\n=== ROUTE HEALTH ===\n");
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Routes:   ${routes.length}`);
    console.log(`Batches of ${batchSize}${restartEvery ? `, restart every ${restartEvery}` : ""}\n`);

    let seen = 0;
    for (let index = 0; index < routes.length; index += batchSize) {
      const batch = routes.slice(index, index + batchSize);
      await Promise.all(batch.map(checkRoute));
      seen += batch.length;
      if (restartEvery && seen % restartEvery === 0 && index + batchSize < routes.length) {
        stopServer(server);
        await sleep(1000);
        server = startServer();
        await waitForServer(baseUrl);
      }
    }

    await checkRedirects();
    await checkSeoEndpoints();
  } finally {
    stopServer(server);
  }

  const slow = rows.filter((row) => row.ok && row.ms > 2000);
  const reportDir = join(repoRoot, "scripts", "docs", "reports");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    join(reportDir, "route-health.json"),
    `${JSON.stringify(
      {
        baseUrl,
        generatedAt: new Date().toISOString(),
        routes: rows,
        failures,
      },
      null,
      2,
    )}\n`,
  );

  console.log("Route".padEnd(46), "Status".padEnd(8), "ms");
  console.log("-".repeat(66));
  for (const row of rows) {
    console.log(
      row.route.padEnd(46),
      String(row.status).padEnd(8),
      String(row.ms),
    );
  }

  if (slow.length) {
    console.log(`\nSlow but successful (>2s): ${slow.length}`);
    for (const row of slow) console.log(`  • ${row.route} — ${row.ms}ms`);
  }

  console.log(`\nFailures: ${failures.length}`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  if (failures.length) process.exitCode = 1;
  else console.log("\nEvery canonical route rendered a complete document.\n");
}

run().catch((error) => {
  console.error(`\nFATAL — ${error.message}\n`);
  process.exitCode = 1;
});
