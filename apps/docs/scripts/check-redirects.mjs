#!/usr/bin/env node
/**
 * Audit — canonical routes, aliases and redirects.
 *
 * Static half of the route contract:
 *   - every redirect source is not a real page;
 *   - every destination resolves to a real page;
 *   - no chains, loops or duplicates;
 *   - all redirects are permanent;
 *   - aliases are absent from the sitemap and the docs route list;
 *   - no internal link points at an alias.
 *
 * The runtime half (HTTP status and response time) lives in
 * `scripts/docs/audits/audit-route-health.mjs`.
 *
 * Usage: node apps/docs/scripts/check-redirects.mjs
 */

import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { REDIRECTS } from "../redirects.mjs";

const URL = fileURLToPath(import.meta.url);
const docsRoot = dirname(dirname(URL));
const appDir = join(docsRoot, "app");

const REQUIRED_ALIASES = {
  "/docs": "/get-started",
  "/framework-guides/quick-start": "/quick-start",
  "/framework-guides/web-components": "/framework-guides/web",
  "/framework-guides/react-router": "/framework-guides/remix/react-router",
  "/framework-guides/react-router/examples":
    "/framework-guides/remix/react-router/examples",
  "/default-presets": "/presets/default",
  "/brand-presets": "/presets/brand",
};

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

async function pageFiles(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      await pageFiles(full, out);
    } else if (entry.name === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

function toRoute(file) {
  const parts = relative(appDir, file).split(sep).slice(0, -1);
  return `/${parts
    .map((segment) => {
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return "*";
      if (/^\[.+\]$/.test(segment)) return ":";
      return segment;
    })
    .join("/")}`;
}

function matchesRoute(link, pattern) {
  if (pattern === "/*") return true;
  const linkSegments = link.split("/").filter(Boolean);
  const routeSegments = pattern.split("/").filter(Boolean);
  if (routeSegments.includes("*")) {
    const star = routeSegments.indexOf("*");
    const before = routeSegments.slice(0, star);
    if (linkSegments.length < before.length) return false;
    return before.every((segment, index) => segment === linkSegments[index]);
  }
  if (linkSegments.length !== routeSegments.length) return false;
  return routeSegments.every(
    (segment, index) => segment === ":" || segment === linkSegments[index],
  );
}

const routes = new Set((await pageFiles(appDir)).map(toRoute));
const sources = new Set();

/**
 * Known dynamic-segment values, read from the same data files the pages render.
 *
 * A dynamic route is not a catch-all for arbitrary URLs: `/framework-guides/:`
 * only renders real framework slugs. An alias under that prefix is therefore
 * not shadowing a page unless its segment is one of these values.
 */
const KNOWN_DYNAMIC_SEGMENTS = new Map();
function readSlugs(file, pattern = /slug:\s*"([^"]+)"/g) {
  try {
    return new Set([...readFileSync(file, "utf8").matchAll(pattern)].map((m) => m[1]));
  } catch {
    return new Set();
  }
}
// A framework entry may override its canonical path (React Router lives under
// `/framework-guides/remix/react-router`). Such a slug is served by its nested
// route, so the old top-level path is an alias, not a real page.
const frameworkSlugs = readSlugs(join(docsRoot, "lib", "frameworks.tsx"));
frameworkSlugs.delete("react-router");
KNOWN_DYNAMIC_SEGMENTS.set("/framework-guides/:", frameworkSlugs);
KNOWN_DYNAMIC_SEGMENTS.set("/framework-guides/:/examples", frameworkSlugs);
KNOWN_DYNAMIC_SEGMENTS.set(
  "/libraries/:",
  readSlugs(join(docsRoot, "lib", "libraries.tsx")),
);
KNOWN_DYNAMIC_SEGMENTS.set(
  "/packages/:",
  readSlugs(join(docsRoot, "lib", "packages.tsx")),
);

function isRealPage(link) {
  for (const route of routes) {
    if (!matchesRoute(link, route)) continue;
    if (!route.includes(":")) return true;
    const known = KNOWN_DYNAMIC_SEGMENTS.get(route);
    if (!known) return true;
    const routeSegments = route.split("/").filter(Boolean);
    const linkSegments = link.split("/").filter(Boolean);
    const index = routeSegments.indexOf(":");
    if (index === -1) return true;
    if (!known.has(linkSegments[index])) continue;
    return true;
  }
  return false;
}

check(REDIRECTS.length > 0, "no redirects are configured");

for (const [source, destination] of Object.entries(REQUIRED_ALIASES)) {
  const rule = REDIRECTS.find((entry) => entry.source === source);
  check(Boolean(rule), `missing required alias ${source}`);
  if (rule) {
    check(
      rule.destination === destination,
      `${source}: destination ${rule.destination} != required ${destination}`,
    );
  }
}

for (const rule of REDIRECTS) {
  check(rule.source.startsWith("/"), `${rule.source}: source must be absolute`);
  check(
    rule.destination.startsWith("/"),
    `${rule.source}: destination must be absolute`,
  );
  check(rule.permanent === true, `${rule.source}: must be a permanent redirect`);
  check(
    !sources.has(rule.source),
    `${rule.source}: duplicate redirect source`,
  );
  sources.add(rule.source);

  const hitsPage = isRealPage(rule.source);
  check(
    !hitsPage,
    `${rule.source}: source is a real page; redirects must not shadow canonical routes`,
  );

  const destinationIsPage = [...routes].some(
    (route) =>
      matchesRoute(rule.destination, route) &&
      isRealPage(rule.destination),
  );
  check(
    destinationIsPage,
    `${rule.source}: destination ${rule.destination} does not exist`,
  );

  check(
    !REDIRECTS.some(
      (other) =>
        other !== rule && other.source === rule.destination,
    ),
    `${rule.source}: destination is another redirect (chain)`,
  );
  check(
    rule.source !== rule.destination,
    `${rule.source}: redirects to itself`,
  );
}

// Aliases must not be indexed: absent from the sitemap and the canonical docs
// route list.
const sitemap = readFileSync(join(appDir, "sitemap.ts"), "utf8");
const docsRoutes = readFileSync(join(docsRoot, "lib", "docs-routes.ts"), "utf8");
for (const rule of REDIRECTS) {
  check(
    !sitemap.includes(`"${rule.source}"`),
    `${rule.source}: alias appears in the sitemap`,
  );
  check(
    !docsRoutes.includes(`"${rule.source}"`),
    `${rule.source}: alias appears in DOCS_ROUTES`,
  );
}

// Internal links must point at the canonical URL. A link to an alias works
// through the redirect, but it hides the intended destination from crawlers and
// makes every navigation pay for an extra round trip.
const LINK_FILES = ["app", "components", "lib", "content"];
const HREF_RE = /href(?:\s*=\s*{|:)\s*"(\/[^"]*)"/g;
async function walkSources(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      await walkSources(full, out);
    } else if (/\.(tsx?|mdx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

for (const dir of LINK_FILES) {
  for (const file of await walkSources(join(docsRoot, dir))) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(HREF_RE)) {
      const link = match[1].split("#")[0];
      if (sources.has(link)) {
        failures.push(
          `${relative(docsRoot, file)}: internal link points at alias ${link}`,
        );
      }
    }
  }
}

// The metadata endpoints must reference the canonical sitemap URL.
const robots = readFileSync(join(appDir, "robots.ts"), "utf8");
check(robots.includes("/sitemap.xml"), "robots.ts does not reference /sitemap.xml");
check(
  sitemap.includes("DOCS_ROUTES"),
  "sitemap.ts no longer derives from the canonical docs route list",
);

console.log("\n=== ROUTE & REDIRECT AUDIT ===\n");
console.log(`Routes discovered: ${routes.size}`);
console.log(`Redirects:         ${REDIRECTS.length}`);
console.log(`Failures:          ${failures.length}\n`);
for (const failure of failures) console.log(`  ✗ ${failure}`);
if (failures.length) process.exitCode = 1;
else console.log("Every alias has a canonical, permanent destination.\n");
