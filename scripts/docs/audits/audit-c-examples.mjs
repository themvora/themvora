#!/usr/bin/env node
/**
 * Audit C — canonical examples (docs-system brief §8, §5) — STATIC half.
 *
 * For every example.meta.json under examples/ it validates the invariants that
 * need no network or toolchain:
 *   - the meta schema (feature/framework/packages/files/entry)
 *   - every declared `files` exists, and `entry` is one of them
 *   - every declared `packages` is a shipped, TypeScript entrypoint
 *   - every `expectedExportsUsed` is actually exported by at least one of the
 *     declared packages (INTERNAL excluded), and
 *   - §13 coverage: every capability in the registry has at least one example.
 *
 * An **empty or missing** `examples/` fails. Without that, the structural rules
 * above are vacuously satisfied and the only signal left is a coverage failure
 * per capability — the symptom, not the cause. The rules live in
 * `scripts/docs/lib/example-audit.mjs` so they can be exercised against a
 * synthetic inventory; this file is the CLI around them.
 *
 * The dynamic half (`--dynamic`, Audit C spec §8) — create a temp project,
 * install the declared packages from BUILT TARBALLS, copy `files`, run the
 * framework build/typecheck — lives in `scripts/docs/lib/consumer-compile.mjs`.
 * It needs `pnpm` (to pack) and network (to fetch registry peers).
 *
 * Usage: node scripts/docs/audits/audit-c-examples.mjs [--offline] [--dynamic]
 */

import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadClassification, loadRegistry } from "../lib/registry.mjs";
import { auditExamples, CONTRACT } from "../lib/example-audit.mjs";

const URL = fileURLToPath(import.meta.url);
const repoRoot = join(dirname(dirname(dirname(dirname(URL)))));
const EXAMPLES = join(repoRoot, "examples");

/**
 * Whether version control ignores a path.
 *
 * The concept examples sit under an `/examples/*` blanket rule, so a tree that
 * is restored on disk but left ignored passes this audit and is still absent
 * from every clone. Asking git turns that into a failure. Anything other than a
 * definite "ignored" (no git, not a repository) is treated as "not ignored", so
 * the audit never fails on a missing toolchain.
 */
function isIgnored(absPath) {
  try {
    execFileSync("git", ["check-ignore", "-q", "--", absPath], { cwd: repoRoot, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const capabilitySlugs = Object.values(loadRegistry().capabilities).map((c) => c.slug);
const { metas, failures, coverage } = auditExamples({
  examplesRoot: EXAMPLES,
  classification: loadClassification(),
  capabilitySlugs,
  isIgnored,
});

console.log("\n=== AUDIT C — CANONICAL EXAMPLES (static) ===\n");
console.log(`Examples found: ${metas.length}\n`);
console.log(
  coverage
    ? `§13 coverage: ${coverage.covered}/${coverage.total} capabilities have an example.\n`
    : "§13 coverage: not evaluated — there is no example inventory to cover it.\n",
);

for (const f of failures) {
  console.log(`  ✗ ${f.symbol} — ${f.file}`);
  console.log(`      contract: ${CONTRACT}`);
  console.log(`      detail: ${f.detail}`);
}
console.log(`\nFailures: ${failures.length}`);
if (failures.length) process.exitCode = 1;

// ---------------------------------------------------------------------------
// Offline verify (--offline): typecheck each example's sources against the
// workspace's BUILT declarations, then *render* framework examples with
// react-dom/server so the component tree actually executes. Deterministic, no
// npm install, no network — the always-available half of "the example works".
// ---------------------------------------------------------------------------
if (process.argv.includes("--offline")) {
  if (failures.length) {
    console.log("\nOffline verify skipped: static half failed.");
  } else {
    const { verifyExampleTypecheck, verifyExampleRender } = await import("../lib/consumer-compile.mjs");
    console.log("\n=== AUDIT C — CANONICAL EXAMPLES (offline verify) ===\n");
    let offlineFailures = 0;
    for (const metaPath of metas) {
      const dir = dirname(metaPath);
      const short = dir.slice(repoRoot.length + 1);
      process.stdout.write(`  • ${short} … `);
      try {
        const { tsc } = verifyExampleTypecheck(dir);
        const render = verifyExampleRender(dir);
        console.log(render ? `ok (${tsc}; rendered ${render.html} chars)` : `ok (${tsc})`);
      } catch (e) {
        offlineFailures++;
        console.log("FAIL");
        console.log(`      contract: ${CONTRACT}`);
        console.log(
          String(e.message)
            .split("\n")
            .slice(0, 12)
            .map((l) => `      ${l}`)
            .join("\n"),
        );
      }
    }
    console.log(`\nOffline failures: ${offlineFailures}`);
    if (offlineFailures) process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Dynamic half (--dynamic): pack → install → typecheck → smoke. See
// scripts/docs/lib/consumer-compile.mjs. Requires pnpm + network and a built
// workspace; throws (does not silently skip) when a step fails.
// ---------------------------------------------------------------------------
if (process.argv.includes("--dynamic")) {
  if (failures.length) {
    console.log("\nDynamic half skipped: static half failed.");
  } else {
    const { verifyExampleConsumerCompile, disposeNpmCache } = await import("../lib/consumer-compile.mjs");
    console.log("\n=== AUDIT C — CANONICAL EXAMPLES (dynamic) ===\n");
    let dynamicFailures = 0;
    for (const metaPath of metas) {
      const dir = dirname(metaPath);
      const short = dir.slice(repoRoot.length + 1);
      process.stdout.write(`  • ${short} … `);
      try {
        const { packed } = await verifyExampleConsumerCompile(dir);
        console.log(`ok (packed ${packed.length} tarball(s), installed, tsc, smoke)`);
      } catch (e) {
        dynamicFailures++;
        console.log("FAIL");
        console.log(`      contract: ${CONTRACT}`);
        console.log(`      detail: ${String(e.message).split("\n")[0]}`);
        if (e.stdout) console.log(String(e.stdout));
        if (e.stderr) console.log(String(e.stderr).split("\n").slice(0, 12).join("\n"));
      }
    }
    console.log(`\nDynamic failures: ${dynamicFailures}`);
    disposeNpmCache();
    if (dynamicFailures) process.exitCode = 1;
  }
}
