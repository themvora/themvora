#!/usr/bin/env node
/**
 * Remove generated build output.
 *
 * @remarks
 * `pnpm clean` referenced this file but it did not exist, so the script failed
 * with a module-not-found error. It is deliberately **narrow**: it removes a
 * fixed allowlist of build-output directory names, and only when that directory
 * sits directly inside a workspace package (a directory with a `package.json`).
 *
 * It is not `git clean -fdx`. It never touches source, never touches
 * `node_modules`, never follows a symlink, and refuses anything that resolves
 * outside the repository root. A directory called `dist` that a package
 * genuinely tracks is indistinguishable from a build artefact by name alone, so
 * the allowlist is intentionally the set of names the toolchain itself
 * generates — see {@link BUILD_OUTPUT_NAMES}.
 *
 * Usage:
 * ```bash
 * pnpm clean             # delete
 * pnpm clean --dry-run   # list what would be deleted
 * node scripts/clean.mjs --root <dir>   # operate on another tree (tests)
 * ```
 *
 * @packageDocumentation
 */
import { existsSync, lstatSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Directory names the build tooling generates, and nothing else.
 *
 * - `dist` — tsup / tsc / ng-packagr output.
 * - `.next`, `out` — Next.js build and static export.
 * - `.nuxt`, `.output` — Nuxt build output.
 * - `.astro` — Astro's generated types and content cache.
 * - `.svelte-kit` — SvelteKit's generated types.
 * - `.angular` — Angular CLI build cache.
 * - `coverage` — test coverage reports.
 * - `.turbo` — Turborepo cache.
 */
export const BUILD_OUTPUT_NAMES = new Set([
  "dist",
  ".next",
  "out",
  ".nuxt",
  ".output",
  ".astro",
  ".svelte-kit",
  ".angular",
  "coverage",
  ".turbo",
]);

/**
 * Directories whose immediate children may be workspace packages.
 *
 * Mirrors the `packages:` globs in `pnpm-workspace.yaml`. Kept as an explicit
 * list rather than parsed from that file: a clean script that silently follows
 * a mistyped glob is worse than one that needs a line added when the layout
 * changes.
 */
const WORKSPACE_ROOTS = [
  "packages",
  join("packages", "adapters"),
  "apps",
  "examples",
  join("examples", "apps"),
];

/** Whether `dir` is a directory (not a symlink) that exists. */
function isRealDirectory(dir) {
  try {
    return lstatSync(dir).isDirectory();
  } catch {
    return false;
  }
}

/** Whether `dir` is a workspace package root. */
function isPackageRoot(dir) {
  return existsSync(join(dir, "package.json"));
}

/**
 * Collect the build-output directories under `root`.
 *
 * @param {string} root - The repository root.
 * @returns {string[]} Absolute paths, sorted, each verified to be inside `root`.
 */
export function collectBuildOutputs(root) {
  const absoluteRoot = resolve(root);
  const found = [];

  for (const relativeRoot of WORKSPACE_ROOTS) {
    const parent = resolve(absoluteRoot, relativeRoot);
    if (!isRealDirectory(parent)) continue;

    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const packageDir = join(parent, entry.name);
      if (!isPackageRoot(packageDir)) continue;

      for (const name of BUILD_OUTPUT_NAMES) {
        const candidate = join(packageDir, name);
        if (!isRealDirectory(candidate)) continue;
        // Containment re-check: nothing outside the root can ever be listed,
        // even if a workspace directory is itself a symlink out of the tree.
        if (!resolve(candidate).startsWith(absoluteRoot + sep)) continue;
        found.push(candidate);
      }
    }
  }

  return found.sort();
}

/**
 * Delete the collected build outputs.
 *
 * @param {string} root - The repository root.
 * @param {{ dryRun?: boolean, log?: (message: string) => void }} [options]
 * @returns {{ removed: string[], bytes: number }} What was (or would be) removed.
 */
export function cleanBuildOutputs(root, options = {}) {
  const { dryRun = false, log = () => {} } = options;
  const absoluteRoot = resolve(root);
  const removed = [];
  let bytes = 0;

  for (const target of collectBuildOutputs(absoluteRoot)) {
    // Guard rails, re-asserted at the point of deletion rather than trusted
    // from the collector.
    if (dirname(target) === absoluteRoot) continue;
    if (!resolve(target).startsWith(absoluteRoot + sep)) continue;
    if (!BUILD_OUTPUT_NAMES.has(target.slice(target.lastIndexOf(sep) + 1))) continue;
    if (lstatSync(target).isSymbolicLink()) continue;

    bytes += directorySize(target);
    removed.push(target);
    log(`${dryRun ? "would remove" : "removed"} ${target.slice(absoluteRoot.length + 1)}`);
    if (!dryRun) rmSync(target, { recursive: true, force: true });
  }

  return { removed, bytes };
}

/** Recursive byte size, for the summary line. Never throws. */
function directorySize(dir) {
  let total = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      try {
        if (entry.isDirectory()) total += directorySize(path);
        else if (entry.isFile()) total += statSync(path).size;
      } catch {
        /* a file that vanished mid-walk is not worth failing the clean over */
      }
    }
  } catch {
    /* unreadable directory: report 0 rather than throwing */
  }
  return total;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(1)} ${units[index]}`;
}

function parseArgs(argv) {
  const options = { dryRun: false, root: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--root") {
      const next = argv[index + 1];
      if (!next) throw new Error("--root requires a directory");
      options.root = next;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`clean: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    console.log(
      "Usage: node scripts/clean.mjs [--dry-run] [--root <dir>]\n\n" +
        "Removes generated build output (dist, .next, .nuxt, …) from workspace\n" +
        "packages. Source files, node_modules and untracked work are untouched.",
    );
    return;
  }

  const root =
    options.root ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const { removed, bytes } = cleanBuildOutputs(root, {
    dryRun: options.dryRun,
    log: (message) => console.log(message),
  });

  if (removed.length === 0) {
    console.log("clean: nothing to remove");
    return;
  }

  console.log(
    `clean: ${removed.length} director${removed.length === 1 ? "y" : "ies"}, ` +
      `${formatBytes(bytes)} ${options.dryRun ? "would be freed" : "freed"}`,
  );
}

// Only run when invoked directly, so the module can be imported by tests.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
