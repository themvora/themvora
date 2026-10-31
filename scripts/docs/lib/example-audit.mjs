/**
 * Audit C's validation rules, with the repository paths lifted out.
 *
 * The audit used to be a script that hardcoded `repoRoot/examples` and read the
 * registry and classification itself, which made its rules untestable: the only
 * way to exercise them was to mutate the real repository. Here the same rules
 * take an explicit `examplesRoot` and an explicit capability list, so a test can
 * build a synthetic inventory and assert on the result.
 *
 * The rules are unchanged from the script they were lifted from:
 *   - the meta schema (feature/framework/packages/files/entry)
 *   - every declared `files` exists, and `entry` is one of them
 *   - every declared `packages` is a shipped, TypeScript entrypoint
 *   - every `expectedExportsUsed` is exported by at least one declared package
 *     (INTERNAL excluded)
 *   - §13 coverage: every capability slug has at least one example
 *   - an absent or empty inventory is itself a failure
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

import { entrypointsOf, resolveSpecifier } from "./api-index.mjs";

export const CONTRACT =
  "brief §8 Audit C — every example's meta.json must match the shipped ecosystem";

/** Directories that never contain example metadata: installed dependencies and
 *  build output. Walking them is slow, and `node_modules` in particular is full
 *  of symlinks whose targets a partial install may not have created — following
 *  one of those aborts the whole audit with ENOENT on a path no example owns. */
const SKIP_DIRECTORIES = new Set(["node_modules", "dist", ".next", ".astro", ".turbo", ".git"]);

/** Every `example.meta.json` under `dir`, recursively. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // `withFileTypes` means a symlink is reported as a symlink, never followed,
    // so a dangling link cannot turn into a stat() error.
    if (entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      out.push(...walk(full));
    } else if (entry.name === "example.meta.json") {
      out.push(full);
    }
  }
  return out;
}

/**
 * Validate one inventory of examples.
 *
 * @param options - The inventory and the shipped surface to validate it against.
 * @param options.examplesRoot - Absolute path to the `examples/` directory.
 * @param options.classification - `docs/reference/public-api.json`.
 * @param options.capabilitySlugs - Every capability slug in the registry.
 * @param options.isIgnored - Optional predicate: does version control ignore this
 *   path? An ignored inventory is one a fresh clone does not have.
 * @returns The discovered metadata files, the failures, and the coverage result.
 */
export function auditExamples({ examplesRoot, classification, capabilitySlugs, isIgnored }) {
  const entrypoints = entrypointsOf(classification);
  const failures = [];
  const fail = (file, symbol, detail) => failures.push({ file, symbol, contract: CONTRACT, detail });

  // An absent or empty inventory is not a clean repository. Without this guard
  // the structural half reports "0 failures" for every invariant — there is
  // nothing to violate — and the only remaining signal is a wall of coverage
  // failures that describes the symptom ("capability X has no example") rather
  // than the cause ("there are no examples at all"). That is how the example
  // trees went missing in 2.0.0 and went unnoticed.
  const inventoryPresent = existsSync(examplesRoot);
  const metas = inventoryPresent ? walk(examplesRoot) : [];

  if (metas.length === 0) {
    fail(
      "examples/**",
      "(inventory)",
      inventoryPresent
        ? "no example.meta.json was found under examples/ — an empty inventory cannot be " +
          "distinguished from a broken collector, so it fails instead of reporting clean"
        : "examples/ does not exist — the canonical example inventory is missing",
    );
  }

  // An inventory that exists only on this machine is not an inventory. The
  // metadata was git-ignored when this check was written, so a restore could
  // pass locally and be absent from every clone — the same blind spot, one layer
  // down. When the caller can answer the question, answer it.
  if (typeof isIgnored === "function") {
    for (const metaPath of metas) {
      if (isIgnored(metaPath)) {
        fail(
          metaPath,
          "(git)",
          "this metadata file is git-ignored — a fresh clone would not have it, so the " +
            "audit would be validating content the repository cannot carry",
        );
      }
    }
  }

  const coveredFeatures = new Set();

  for (const metaPath of metas) {
    const dir = dirname(metaPath);
    let meta;
    try {
      meta = JSON.parse(readFileSync(metaPath, "utf8"));
    } catch (e) {
      fail(metaPath, "(meta)", `unparsable JSON: ${e.message}`);
      continue;
    }

    for (const field of ["feature", "framework", "packages", "files", "entry"]) {
      if (meta[field] === undefined) fail(metaPath, "(meta)", `missing \`${field}\``);
    }
    if (typeof meta.feature === "string") coveredFeatures.add(meta.feature);
    if (!Array.isArray(meta.files)) continue;

    if (!meta.files.includes(meta.entry)) {
      fail(metaPath, meta.entry ?? "(entry)", "`entry` not listed in `files`");
    }
    for (const f of meta.files) {
      if (!existsSync(join(dir, f))) fail(metaPath, f, `declared file does not exist`);
    }

    for (const pkg of meta.packages ?? []) {
      const resolved = resolveSpecifier(classification, pkg);
      if (!resolved) fail(metaPath, pkg, `declares package "${pkg}", which is not a shipped entrypoint`);
      else if (resolved.isAsset) fail(metaPath, pkg, `declares "${pkg}", which has no TypeScript surface`);
    }

    // A symbol is covered if at least one declared package exports it (post-@internal).
    for (const symbol of meta.expectedExportsUsed ?? []) {
      let found = false;
      for (const pkg of meta.packages ?? []) {
        const resolved = resolveSpecifier(classification, pkg);
        if (!resolved || resolved.isAsset) continue;
        const rows =
          resolved.entry === "."
            ? [...entrypoints.entries()].filter(([k]) => k.startsWith(`${resolved.pkg}|`)).map(([, r]) => r)
            : [entrypoints.get(`${resolved.pkg}|${resolved.entry}`)];
        if (rows.some((r) => r?.[symbol] && r[symbol] !== "INTERNAL")) {
          found = true;
          break;
        }
      }
      if (!found) {
        fail(
          metaPath,
          symbol,
          `expectedExportsUsed "${symbol}" is exported by none of "${(meta.packages ?? []).join(", ")}"`,
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // §13 coverage: every capability needs at least one canonical example.
  // One-directional (capability → example): extra examples are allowed — e.g.
  // `basic-theme`, a getting-started example that is not itself a capability.
  //
  // Skipped when the inventory is empty: there, every capability is uncovered
  // for the same single reason, and repeating it once per slug buries the cause.
  // -------------------------------------------------------------------------
  let coverage = null;
  if (metas.length > 0) {
    const uncovered = capabilitySlugs.filter((s) => !coveredFeatures.has(s)).sort();
    coverage = {
      total: capabilitySlugs.length,
      covered: capabilitySlugs.length - uncovered.length,
      uncovered,
    };
    for (const slug of uncovered) {
      fail("(coverage)", slug, `capability "${slug}" has no example under examples/**`);
    }
  }

  return { metas, failures, coverage };
}
