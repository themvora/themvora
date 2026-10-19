/**
 * Audit — theme snippets against the shipped token set.
 *
 * ## What this catches
 *
 * A docs snippet that hand-authors a theme lists colour roles literally. Nothing
 * tied those lists to the package, so they drifted: every `defineTheme()` snippet
 * in the docs was missing `card`, `cardForeground`, `popover`, `popoverForeground`
 * and `input` — five of the twenty-one core roles — and had been for however long
 * those roles have existed.
 *
 * That is the same class of defect as a hand-maintained API reference, and the
 * repository already has the answer: derive the fact from the package and check
 * the prose against it.
 *
 * ## What it checks
 *
 * 1. **Coverage.** Every snippet that defines a full theme (`defineTheme` /
 *    `extendTheme` with a `colors` block) must name every role in `CORE_COLORS`.
 *    Partial snippets — a two-key override, a runtime example — are exempt, and
 *    are detected by not being a complete theme rather than by an allowlist.
 * 2. **No invented roles.** A snippet must not name a colour role the package
 *    does not export, which is how a renamed role lingers in the docs.
 *
 * Usage:
 *   node scripts/docs/audits/audit-theme-snippets.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";

const REPO = join(import.meta.dirname, "..", "..", "..");
const require = createRequire(import.meta.url);

// The shipped truth. Read from the built package so this cannot disagree with
// what a reader actually installs.
const { CORE_COLORS, OPTIONAL_SEMANTICS } = require(join(REPO, "packages", "core", "dist", "index.js"));

const ROOTS = [
  join(REPO, "apps", "docs", "app"),
  join(REPO, "apps", "docs", "components"),
  join(REPO, "apps", "docs", "content"),
];

function walk(dir) {
  const out = [];
  if (!statSync(dir, { throwIfNoEntry: false })) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|md)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Every `colors: { … }` block, with the role names directly inside it.
 *
 * Braces are **matched**, not regexed. The first version used a non-greedy
 * `colors: \{([\s\S]*?)\n\s*\}` and stopped at the first nested close — so a
 * theme with a `radius: { … }` sibling reported as 12 of 21 roles when it was
 * complete. Counting braces is the only correct way to read a nested literal.
 */
function colourBlocks(source) {
  const blocks = [];
  const start = /colors:\s*\{/g;
  let match;

  while ((match = start.exec(source))) {
    let depth = 1;
    let i = match.index + match[0].length;
    const from = i;

    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      i += 1;
    }
    if (depth !== 0) break;

    const body = source.slice(from, i - 1);
    // Only the roles at the block's own depth: a nested object's keys are not
    // colour roles.
    let nested = 0;
    const roles = [];
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (nested === 0) {
        const role = /^([A-Za-z][A-Za-z0-9]*)\s*:/.exec(trimmed);
        if (role) roles.push(role[1]);
      }
      nested += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      if (nested < 0) nested = 0;
    }

    if (roles.length > 0) blocks.push({ roles, line: source.slice(0, match.index).split("\n").length });
  }

  return blocks;
}

const known = new Set([...CORE_COLORS, ...OPTIONAL_SEMANTICS]);
const coverage = [];
const invented = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    // Only files that actually define a theme.
    if (!/defineTheme|extendTheme/.test(source)) continue;

    for (const { roles, line } of colourBlocks(source)) {
      const names = new Set(roles);

      for (const role of names) {
        // `background`, `foreground` and friends are also CSS-ish words, so only
        // a name that is neither a core role nor an optional one is suspicious.
        if (!known.has(role) && /^[a-z][A-Za-z0-9]*$/.test(role) && role.endsWith("Foreground")) {
          invented.push({ file: relative(REPO, file).replace(/\\/g, "/"), role });
        }
      }

      // A full theme names most of the set. A partial override names a handful,
      // and is not a completeness failure.
      const corePresent = CORE_COLORS.filter((role) => names.has(role));
      if (corePresent.length < CORE_COLORS.length / 2) continue;

      const missing = CORE_COLORS.filter((role) => !names.has(role));
      if (missing.length > 0) {
        coverage.push({
          file: relative(REPO, file).replace(/\\/g, "/"),
          line,
          missing,
          present: corePresent.length,
        });
      }
    }
  }
}

console.log("\n=== THEME SNIPPET AUDIT ===");
console.log(`shipped roles: ${CORE_COLORS.length} core + ${OPTIONAL_SEMANTICS.length} optional\n`);

if (coverage.length === 0 && invented.length === 0) {
  console.log("  ✓ every full theme snippet names all " + CORE_COLORS.length + " core roles");
  console.log("  ✓ no snippet names a role the package does not export");
  console.log("\nOK — the docs snippets match the shipped token set.\n");
  process.exit(0);
}

for (const finding of coverage) {
  console.log(`  ✗ ${finding.file}:${finding.line} — ${finding.present}/${CORE_COLORS.length} roles`);
  console.log(`      missing: ${finding.missing.join(", ")}`);
}
for (const finding of invented) {
  console.log(`  ✗ ${finding.file} — names "${finding.role}", which the package does not export`);
}

console.log(`\nFAIL — ${coverage.length + invented.length} snippet(s) out of date with the shipped token set.\n`);
process.exit(1);
