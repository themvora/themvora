#!/usr/bin/env node
/**
 * Published-tarball install matrix for Themvora dependency isolation.
 *
 * For every row below, this creates a disposable project under
 * release-test/dependency-matrix/.work/<id>, installs the package from its
 * REAL PACKED TARBALL (produced by scripts/release/pack-verify.mjs into
 * release-test/tarballs/*.tgz), and then asserts that the resolved production
 * tree contains exactly the expected `@themvora/*` set and none of the
 * forbidden framework/design-system packages beyond those the row allows.
 *
 * Why this catches what the source-level audit cannot: the source audit BFSes
 * workspace package.json files. This matrix instead observes what `npm` actually
 * resolves and places in node_modules when a consumer installs a published
 * tarball — including npm 7+ peer auto-install behavior and any transitive
 * third-party deps that pnpm-lock-based reasoning would miss.
 *
 * Usage: node release-test/dependency-matrix/run.mjs
 * Env:
 *   TV_MATRIX_REUSE_TARBALLS=1   skip packing; reuse existing tarballs
 * Exit: 0 when every row passes, non-zero on any failure (release gate).
 */

import { execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const tarballsDir = join(repoRoot, "release-test", "tarballs");
const workDir = join(here, ".work");

// --- forbidden classes --------------------------------------------------------
// A package name in the resolved tree is "forbidden" if it matches one of these
// matchers (exact, or `scope/*` prefix). The row's `allowed` list carves out the
// specific forbidden packages that are expected for that row.
const FORBIDDEN = [
  "react",
  "react-dom",
  "vue",
  "svelte",
  "solid-js",
  "@angular/core",
  "next",
  "nuxt",
  "astro",
  "@remix-run/*",
  "@mui/*",
  "@emotion/*",
  "@chakra-ui/*",
  "antd",
  "@mantine/*",
  "bootstrap",
  "daisyui",
  "tailwindcss",
];

function matches(matcher, name) {
  if (matcher.endsWith("/*")) return name.startsWith(matcher.slice(0, -1));
  return name === matcher;
}

function isForbidden(name) {
  return FORBIDDEN.some((m) => matches(m, name));
}

const shortName = (name) => name.replace(/^@themvora\//, "");

// --- install matrix -----------------------------------------------------------
// id → { pkg, extra (npm specs installed alongside), expected (short names),
//        allowed (forbidden matchers the row allows), neutral (zero third-party) }
const MATRIX = [
  { id: "core", pkg: "@themvora/core", extra: [], expected: ["core"], allowed: [], neutral: true },
  { id: "web", pkg: "@themvora/web", extra: [], expected: ["core", "web"], allowed: [], neutral: true },
  // Not `neutral` any more: the guided `init` wizard runs on boxen, chalk,
  // figlet, inquirer and ora, so the published CLI has a deliberate third-party
  // runtime (and its transitive closure). The guarantee that still matters — a
  // CLI install must never drag a framework or design system into a consumer's
  // tree — is the `allowed: []` row against FORBIDDEN, which is unchanged.
  { id: "cli", pkg: "@themvora/cli", extra: [], expected: ["core", "cli"], allowed: [] },
  { id: "devtools", pkg: "@themvora/devtools", extra: [], expected: ["core", "devtools"], allowed: [], neutral: true },
  { id: "tailwind", pkg: "@themvora/tailwind", extra: ["tailwindcss@4"], expected: ["core", "tailwind"], allowed: ["tailwindcss"] },
  { id: "react", pkg: "@themvora/react", extra: ["react@19", "react-dom@19"], expected: ["core", "react"], allowed: ["react", "react-dom"] },
  { id: "vue", pkg: "@themvora/vue", extra: ["vue@3"], expected: ["core", "web", "vue"], allowed: ["vue"] },
  { id: "svelte", pkg: "@themvora/svelte", extra: ["svelte@5"], expected: ["core", "web", "svelte"], allowed: ["svelte"] },
  { id: "solid", pkg: "@themvora/solid", extra: ["solid-js@1"], expected: ["core", "web", "solid"], allowed: ["solid-js"] },
  // @angular/common is installed explicitly alongside @angular/core so npm does
  // not auto-install a mismatched latest `@angular/common` (both are required
  // peers of @themvora/angular; @angular/common itself is not a forbidden class).
  { id: "angular", pkg: "@themvora/angular", extra: ["@angular/core@19", "@angular/common@19"], expected: ["core", "web", "angular"], allowed: ["@angular/core", "tslib"] },
  { id: "astro", pkg: "@themvora/astro", extra: ["astro@5"], expected: ["core", "web", "astro"], allowed: ["astro"] },
  { id: "next", pkg: "@themvora/next", extra: ["next@15", "react@19", "react-dom@19"], expected: ["core", "react", "next"], allowed: ["next", "react", "react-dom"] },
  { id: "remix", pkg: "@themvora/remix", extra: ["@remix-run/react@2", "@remix-run/node@2", "react@19", "react-dom@19"], expected: ["core", "react", "remix"], allowed: ["@remix-run/*", "react", "react-dom"] },
  // nuxt → vue → web, so the correct @themvora closure includes web too.
  { id: "nuxt", pkg: "@themvora/nuxt", extra: ["nuxt@3", "vue@3"], expected: ["core", "vue", "web", "nuxt"], allowed: ["nuxt", "vue"] },
  // KEY: installing shadcn with no framework must not pull react (or @themvora/react).
  { id: "shadcn", pkg: "@themvora/shadcn", extra: [], expected: ["core", "adapters", "shadcn"], allowed: [] },
  { id: "shadcn-react", pkg: "@themvora/shadcn", extra: ["react@19", "react-dom@19"], expected: ["core", "adapters", "shadcn"], allowed: ["react", "react-dom"] },
  { id: "unocss", pkg: "@themvora/unocss", extra: ["unocss@66"], expected: ["core", "adapters", "unocss"], allowed: ["@unocss/*", "unocss"] },
  { id: "mui", pkg: "@themvora/mui", extra: ["@mui/material@9", "@emotion/react@11", "@emotion/styled@11", "react@19", "react-dom@19"], expected: ["core", "adapters", "mui"], allowed: ["@mui/*", "@emotion/*", "react", "react-dom"] },
];

// --- helpers ------------------------------------------------------------------

function collectWorkspacePackages() {
  const out = new Map();
  for (const base of ["packages", join("packages", "adapters")]) {
    const baseAbs = join(repoRoot, base);
    if (!existsSync(baseAbs)) continue;
    for (const entry of readdirSync(baseAbs)) {
      const pj = join(baseAbs, entry, "package.json");
      if (!existsSync(pj)) continue;
      const json = JSON.parse(readFileSync(pj, "utf8"));
      if (json.private) continue;
      out.set(json.name, { version: json.version });
    }
  }
  return out;
}

function tarballFor(pkgName, versions) {
  const short = shortName(pkgName);
  const version = versions.get(pkgName)?.version;
  if (!version) throw new Error(`no workspace version for ${pkgName}`);
  const file = join(tarballsDir, `themvora-${short}-${version}.tgz`);
  if (!existsSync(file)) {
    throw new Error(`missing tarball ${file} — run scripts/release/pack-verify.mjs first`);
  }
  return file;
}

// Recursively enumerate every package physically installed under a node_modules
// directory (handles scoped dirs and nested node_modules).
function collectInstalled(nodeModulesDir) {
  const names = new Set();
  const stack = [nodeModulesDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.name === ".bin") continue;
      const full = join(dir, e.name);
      if (e.name === "node_modules") {
        stack.push(full);
        continue;
      }
      if (e.name.startsWith("@")) {
        stack.push(full); // scope dir (e.g. @themvora) → descend to real packages
        continue;
      }
      const pj = join(full, "package.json");
      if (existsSync(pj)) {
        try {
          const json = JSON.parse(readFileSync(pj, "utf8"));
          if (json.name) names.add(json.name);
        } catch {
          /* ignore unreadable package.json */
        }
        const nested = join(full, "node_modules");
        if (existsSync(nested)) stack.push(nested);
      }
    }
  }
  return names;
}

// Parse an `npm ls --all --json` tree into a set of package names. The package
// name is the KEY of each `dependencies` entry (not a `name` property on it).
function collectNpmLs(root) {
  const names = new Set();
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    for (const [name, child] of Object.entries(node.dependencies ?? {})) {
      names.add(name);
      visit(child);
    }
  };
  visit(root);
  return names;
}

function quoteArg(a) {
  return a.includes(" ") ? `"${a}"` : a;
}

function runNpm(args, cwd, { timeout = 600000 } = {}) {
  const cmd = `npm ${args.map(quoteArg).join(" ")}`;
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      timeout,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      status: typeof err.status === "number" ? err.status : 1,
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? err.message ?? ""),
    };
  }
}

function looksLikeRegistryFailure(text) {
  return /E404|ETARGET|404 Not Found|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ECONNRESET|network|fetch failed|getaddrinfo|Could not resolve|npm error code E40|ERR_SOCKET|TLS|unable to verify|proxy/i.test(
    text,
  );
}

function packTarballs() {
  if (process.env.TV_MATRIX_REUSE_TARBALLS === "1") {
    console.log("Reusing existing tarballs (TV_MATRIX_REUSE_TARBALLS=1).\n");
    return;
  }
  console.log("Packing tarballs via scripts/release/pack-verify.mjs ...");
  const script = join(repoRoot, "scripts", "release", "pack-verify.mjs");
  const r = spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.error(String(r.stdout ?? ""));
    console.error(String(r.stderr ?? ""));
    throw new Error(`pack-verify.mjs failed (exit ${r.status})`);
  }
  const summary = String(r.stdout ?? "")
    .split(/\r?\n/)
    .filter((l) => /packages packed|failed|packed,/.test(l))
    .join(" | ");
  console.log(`✓ ${summary || "packed"}\n`);
}

// --- run ----------------------------------------------------------------------

function main() {
  const startedAt = Date.now();

  packTarballs();
  const versions = collectWorkspacePackages();

  // Validate every row's tarball exists up front (fail fast on a missing pack).
  for (const row of MATRIX) tarballFor(row.pkg, versions);

  mkdirSync(workDir, { recursive: true });
  const results = [];
  const quirks = [];

  for (const row of MATRIX) {
    const rowDir = join(workDir, row.id);
    rmSync(rowDir, { recursive: true, force: true });
    mkdirSync(rowDir, { recursive: true });
    writeFileSync(
      join(rowDir, "package.json"),
      JSON.stringify(
        { name: `tv-matrix-${row.id}`, version: "0.0.0", private: true, type: "module" },
        null,
        2,
      ) + "\n",
      "utf8",
    );

    // Install the full @themvora closure from LOCAL tarballs so npm resolves
    // transitive workspace deps against the LOCAL (refactored) graph rather than
    // the registry. The published 1.3.0 registry metadata still predates the
    // dependency-isolation refactor in places (e.g. @themvora/vue@1.3.0 still
    // lists open-props/bootstrap/shadcn/daisyui), so a single-tarball install
    // would otherwise observe the stale registry graph instead of the tarball
    // under test. Third-party peers still resolve from the registry as intended.
    const closureTarballs = row.expected.map((short) => tarballFor(`@themvora/${short}`, versions));
    const installArgs = ["install", ...closureTarballs, ...row.extra, "--no-audit", "--no-fund", "--no-package-lock", "--ignore-scripts"];

    let install = runNpm(installArgs, rowDir);
    let legacyPeerDeps = false;
    if (install.status !== 0 && /ERESOLVE/.test(install.stderr + install.stdout)) {
      quirks.push(`${row.id}: npm peer-resolution conflict (ERESOLVE); retried with --legacy-peer-deps`);
      install = runNpm([...installArgs, "--legacy-peer-deps"], rowDir);
      legacyPeerDeps = true;
    }

    // Persist the install log and npm ls tree for diagnosis regardless of outcome.
    writeFileSync(join(rowDir, "install.log"), `$ npm ${installArgs.map(quoteArg).join(" ")}\n\n${install.stdout}\n${install.stderr}`, "utf8");

    let result;
    if (install.status !== 0) {
      const registry = looksLikeRegistryFailure(install.stdout + install.stderr);
      result = {
        id: row.id,
        pkg: row.pkg,
        status: registry ? "REGISTRY-FAIL" : "FAIL",
        error: (install.stderr || install.stdout || "install failed").trim().split(/\r?\n/).slice(-8).join("\n"),
        legacyPeerDeps,
      };
      results.push(result);
      continue;
    }

    // Enumerate the resolved production tree.
    const installed = collectInstalled(join(rowDir, "node_modules"));
    let lsNames = null;
    let lsError = null;
    const ls = runNpm(["ls", "--all", "--json"], rowDir, { timeout: 300000 });
    if (ls.status === 0) {
      try {
        lsNames = collectNpmLs(JSON.parse(ls.stdout));
      } catch {
        lsNames = null;
      }
    } else {
      lsError = ls.stderr.trim().split(/\r?\n/).slice(-3).join(" ");
    }
    writeFileSync(join(rowDir, "npm-ls.json"), ls.stdout || ls.stderr || "", "utf8");

    const themvoraFound = [...installed].filter((n) => n.startsWith("@themvora/")).map(shortName).sort();
    const expectedSorted = [...row.expected].sort();
    const themvoraExtra = themvoraFound.filter((n) => !expectedSorted.includes(n));
    const themvoraMissing = expectedSorted.filter((n) => !themvoraFound.includes(n));

    const forbiddenFound = [...installed].filter(isForbidden).sort();
    const unexpected = forbiddenFound.filter((n) => !row.allowed.some((m) => matches(m, n)));

    const thirdParty = [...installed].filter((n) => !n.startsWith("@themvora/"));
    const neutralViolations = row.neutral ? thirdParty.filter((n) => !n.startsWith("tv-matrix-")) : [];

    const lsThemvora = lsNames
      ? [...lsNames].filter((n) => n.startsWith("@themvora/")).map(shortName).sort()
      : null;

    const ok =
      themvoraExtra.length === 0 &&
      themvoraMissing.length === 0 &&
      unexpected.length === 0 &&
      neutralViolations.length === 0;

    result = {
      id: row.id,
      pkg: row.pkg,
      status: ok ? "PASS" : "FAIL",
      themvoraFound,
      themvoraExtra,
      themvoraMissing,
      unexpected,
      neutralViolations,
      legacyPeerDeps,
      lsThemvora,
      lsError,
    };
    results.push(result);
  }

  // --- report ----------------------------------------------------------------
  console.log("\n=== THEME KIT DEPENDENCY MATRIX (published tarballs) ===\n");
  console.log(
    [
      "ROW".padEnd(13),
      "EXPECTED @themvora".padEnd(22),
      "UNEXPECTED".padEnd(34),
      "RESULT",
    ].join(" "),
  );
  console.log("-".repeat(90));

  for (const r of results) {
    const expected = r.expected
      ? `{${[...r.expected].sort().join(", ")}}`
      : (r.pkg ?? "-");
    let detail = "";
    if (r.status === "FAIL") {
      const parts = [];
      if (r.themvoraExtra?.length) parts.push(`+@themvora/{${r.themvoraExtra.join(", ")}}`);
      if (r.themvoraMissing?.length) parts.push(`-@themvora/{${r.themvoraMissing.join(", ")}}`);
      if (r.unexpected?.length) parts.push(`forbidden {${r.unexpected.join(", ")}}`);
      if (r.neutralViolations?.length) parts.push(`third-party {${r.neutralViolations.join(", ")}}`);
      detail = parts.join("; ") || "see log";
    } else if (r.status === "REGISTRY-FAIL") {
      detail = "registry/network fetch failed";
    } else {
      detail = "-";
    }
    console.log(
      [
        r.id.padEnd(13),
        expected.padEnd(22),
        detail.padEnd(34),
        r.status + (r.legacyPeerDeps ? " (--legacy-peer-deps)" : ""),
      ].join(" "),
    );
    if (r.status !== "PASS" && r.error) {
      console.log(`          ${r.error.replace(/\r?\n/g, "\n          ")}`);
    }
    if (r.lsThemvora && r.lsThemvora.join(",") !== (r.themvoraFound ?? []).join(",")) {
      console.log(`          note: npm ls @themvora set {${r.lsThemvora.join(", ")}} differs from physical walk {${(r.themvoraFound ?? []).join(", ")}}`);
    }
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const registryFail = results.filter((r) => r.status === "REGISTRY-FAIL").length;
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log("\n=== SUMMARY ===");
  console.log(`Rows: ${results.length}  Pass: ${pass}  Fail: ${fail}  Registry-fail: ${registryFail}  Runtime: ${seconds}s`);
  if (quirks.length) {
    console.log("\nnpm peer-resolution quirks:");
    for (const q of quirks) console.log(`  • ${q}`);
  }

  const anyFailure = fail > 0 || registryFail > 0;
  if (anyFailure) {
    console.log(`\nKept ${workDir} for diagnosis.`);
  } else {
    rmSync(workDir, { recursive: true, force: true });
    console.log(`\nCleaned ${workDir}.`);
  }

  console.log(`\nExit: ${anyFailure ? "FAIL (1)" : "OK (0)"}`);
  process.exitCode = anyFailure ? 1 : 0;
}

main();
