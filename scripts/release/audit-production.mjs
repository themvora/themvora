#!/usr/bin/env node
/**
 * Production dependency audit, scoped to the surface that actually ships.
 *
 * @remarks
 * `pnpm audit --prod` audits the whole lockfile, which in this repository means
 * three different things at once:
 *
 * - the **published packages** — what a consumer installs;
 * - their **peer dependencies**, installed in the workspace so the packages can
 *   be built and tested (Next, Nuxt, Astro, React …);
 * - the **docs app and the example fixtures**, which are applications, not
 *   libraries.
 *
 * A blanket `--prod` audit therefore fails on advisories that no consumer of
 * `@themvora/*` can ever reach, and the only ways to make it pass would be to
 * upgrade framework majors inside the fixtures or to suppress findings. Neither
 * is acceptable, and neither would tell a maintainer anything about the
 * published packages.
 *
 * So this script computes the **published runtime closure** — each package's
 * `dependencies`, following `workspace:` links into sibling packages, and
 * deliberately *not* following `devDependencies` or `peerDependencies` — and
 * fails only when an advisory lands inside it. Everything else is reported as
 * an informational summary so the numbers stay visible.
 *
 * Usage:
 * ```bash
 * node scripts/release/audit-production.mjs
 * node scripts/release/audit-production.mjs --fail-on=high
 * node scripts/release/audit-production.mjs --json
 * ```
 *
 * @packageDocumentation
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SEVERITIES = ["low", "moderate", "high", "critical"];

/**
 * Read every workspace package manifest under `packages/`.
 *
 * @returns {{ name: string, dir: string, manifest: object }[]}
 */
export function readPublishedPackages(root = REPO_ROOT) {
  const packagesDir = join(root, "packages");
  const found = [];

  function visit(dir) {
    if (!existsSync(join(dir, "package.json"))) return;
    const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    if (manifest.name?.startsWith("@themvora/") && manifest.private !== true) {
      found.push({ name: manifest.name, dir, manifest });
    }
  }

  // `packages/*` and `packages/adapters/*` — the two workspace globs that hold
  // publishable packages. `apps/` and `examples/` are applications.
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(packagesDir, entry.name);
    if (entry.name === "adapters") {
      for (const adapter of readdirSync(dir, { withFileTypes: true })) {
        if (adapter.isDirectory()) visit(join(dir, adapter.name));
      }
      continue;
    }
    visit(dir);
  }

  return found;
}

/**
 * The external packages in the published runtime closure.
 *
 * @param root - Repository root.
 * @returns `Map<packageName, Set<importer>>`.
 */
export function shippedRuntimeClosure(root = REPO_ROOT) {
  const packages = readPublishedPackages(root);
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const shipped = new Map();
  const seen = new Set();

  function add(name, importer) {
    if (!shipped.has(name)) shipped.set(name, new Set());
    shipped.get(name).add(importer);
  }

  function walk(name, importer) {
    if (seen.has(name)) return;
    seen.add(name);
    const pkg = byName.get(name);
    if (!pkg) return;

    for (const dependency of Object.keys(pkg.manifest.dependencies ?? {})) {
      add(dependency, importer);
      // `workspace:` links stay inside the repository: follow them so their own
      // runtime dependencies are included.
      if (dependency.startsWith("@themvora/")) walk(dependency, importer);
    }
  }

  for (const pkg of packages) walk(pkg.name, pkg.name);

  // Internal workspace links are not installable packages; drop them.
  for (const name of [...shipped.keys()]) {
    if (name.startsWith("@themvora/")) shipped.delete(name);
  }

  return shipped;
}

/**
 * Run `pnpm audit --prod --json` and return the parsed payload.
 *
 * @remarks
 * `pnpm` is a `.cmd` shim on Windows, and Node refuses to spawn one without a
 * shell. The argument list is a fixed literal, so enabling the shell here does
 * not put any variable text through a command interpreter.
 */
function runAudit() {
  try {
    const stdout = execFileSync("pnpm", ["audit", "--prod", "--json"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (error) {
    // `pnpm audit` exits non-zero when it finds advisories *and* when it fails
    // (no network, bad lockfile). Only the former has a JSON body.
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        /* fall through */
      }
    }
    throw new Error(
      `pnpm audit could not be run: ${error.stderr?.toString().trim() || error.message}`,
    );
  }
}

function severityAtLeast(severity, threshold) {
  return SEVERITIES.indexOf(severity) >= SEVERITIES.indexOf(threshold);
}

function parseArgs(argv) {
  const options = { failOn: "low", json: false, auditJson: null };
  for (const arg of argv) {
    if (arg.startsWith("--fail-on=")) {
      const value = arg.slice("--fail-on=".length);
      if (!SEVERITIES.includes(value)) {
        throw new Error(`--fail-on must be one of ${SEVERITIES.join(", ")}`);
      }
      options.failOn = value;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("--audit-json=")) {
      // Replay a captured `pnpm audit --prod --json` payload instead of running
      // the audit. Exists so the exit-code behaviour can be tested without a
      // network round trip.
      options.auditJson = arg.slice("--audit-json=".length);
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function summarise(advisories) {
  const counts = { low: 0, moderate: 0, high: 0, critical: 0 };
  for (const advisory of advisories) counts[advisory.severity] += 1;
  return counts;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`audit-production: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    console.log(
      "Usage: node scripts/release/audit-production.mjs [--fail-on=low|moderate|high|critical] [--json]\n\n" +
        "Fails when a production advisory lands inside the published runtime\n" +
        "closure of the @themvora/* packages. Advisories in the docs app, the\n" +
        "example fixtures and peer-dependency trees are reported, not failed.",
    );
    return;
  }

  const shipped = shippedRuntimeClosure();
  const audit = options.auditJson
    ? JSON.parse(readFileSync(options.auditJson, "utf8"))
    : runAudit();
  const advisories = Object.values(audit.advisories ?? {});

  const shippedHits = [];
  const otherHits = [];

  for (const advisory of advisories) {
    const inShippedSurface = shipped.has(advisory.module_name);
    const entry = {
      severity: advisory.severity,
      module: advisory.module_name,
      version: advisory.findings[0]?.version ?? "?",
      title: advisory.title,
      patched: advisory.patched_versions,
      url: advisory.url,
      importers: inShippedSurface ? [...shipped.get(advisory.module_name)] : [],
      paths: advisory.findings.flatMap((finding) => finding.paths ?? []),
    };
    (inShippedSurface ? shippedHits : otherHits).push(entry);
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          failOn: options.failOn,
          shipped: { closure: [...shipped.keys()].sort(), advisories: shippedHits },
          other: otherHits,
        },
        null,
        2,
      ),
    );
  } else {
    const shippedCounts = summarise(shippedHits);
    console.log(
      `Published runtime closure (${shipped.size} package${shipped.size === 1 ? "" : "s"}): ` +
        `${[...shipped.keys()].sort().join(", ") || "(none)"}`,
    );

    if (shippedHits.length === 0) {
      console.log("audit-production: no advisories in the published runtime closure");
    } else {
      console.log(
        `audit-production: ${shippedHits.length} advisory(ies) in the published runtime closure ` +
          `(critical ${shippedCounts.critical}, high ${shippedCounts.high}, ` +
          `moderate ${shippedCounts.moderate}, low ${shippedCounts.low})`,
      );
      for (const hit of shippedHits) {
        console.log(
          `  ${hit.severity.padEnd(8)} ${hit.module}@${hit.version} — ${hit.title}\n` +
            `           patched: ${hit.patched}\n` +
            `           importers: ${hit.importers.join(", ")}`,
        );
      }
    }

    const otherCounts = summarise(otherHits);
    console.log(
      `\nOutside the published surface (docs app, example fixtures, peer trees): ` +
        `${otherHits.length} advisory(ies) — critical ${otherCounts.critical}, ` +
        `high ${otherCounts.high}, moderate ${otherCounts.moderate}, low ${otherCounts.low}`,
    );
    const byModule = new Map();
    for (const hit of otherHits) {
      const key = `${hit.module}@${hit.version}`;
      byModule.set(key, (byModule.get(key) ?? 0) + 1);
    }
    for (const [key, count] of [...byModule.entries()].sort()) {
      console.log(`  ${key}${count > 1 ? ` (${count} advisories)` : ""}`);
    }
    console.log(
      "\nSee \"Themvora Security & Reliability Remediation.md\" for why the remaining\n" +
        "entries are outside the shipped surface and what upgrading them requires.",
    );
  }

  const failing = shippedHits.filter((hit) =>
    severityAtLeast(hit.severity, options.failOn),
  );
  if (failing.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch (error) {
    console.error(`audit-production: ${error.message}`);
    process.exitCode = 2;
  }
}
