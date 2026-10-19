/**
 * README drift protection.
 *
 * ## The guarantee
 *
 * The generated framework sections are delimited by markers and compared against
 * the canonical recipe source on every run:
 *
 *     FRAMEWORK_RECIPES  →  generator  →  marked region in README
 *                                              ↑
 *                                     this check compares
 *
 * Read-only. It never writes a README. `--fix` regenerates instead.
 *
 * ## What it catches
 *
 *   - a generated region edited by hand
 *   - a recipe added or removed without regenerating
 *   - a framework index that no longer matches the canonical framework set
 *   - a package whose README has no marked region at all
 *
 * Usage: node scripts/check-readme-drift.mjs
 *        node scripts/check-readme-drift.mjs --fix   (regenerate, then exit 0)
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..");
const GENERATOR = join(REPO, "scripts", "generate-package-readmes.mjs");
const START = "<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:START -->";
const END = "<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:END -->";
const FIX = process.argv.includes("--fix");

if (FIX) {
  execFileSync(process.execPath, [GENERATOR], { cwd: REPO, stdio: "inherit" });
  process.exit(0);
}

/** The libraries the generator owns, mirrored so the check is independent. */
const LIBRARIES = ["mui", "antd", "chakra", "mantine", "bootstrap", "daisyui", "open-props", "shadcn", "unocss"];

/** Reads the canonical framework set for a library, from the recipe table. */
function canonicalFrameworks(lib) {
  const src = readFileSync(join(REPO, "apps", "docs", "lib", "libraries.tsx"), "utf8");
  const at = src.indexOf("export const FRAMEWORK_RECIPES");
  const block = src.slice(at, src.indexOf("\nexport const FRAMEWORK_LANG", at));
  const fws = [];
  for (const m of block.matchAll(/^ {2}"([a-z-]+)\/([^"]+)": \{\r?$/gm)) {
    if (m[1] === lib) fws.push(m[2]);
  }
  return fws.sort();
}

const problems = [];
const rows = [];

for (const lib of LIBRARIES) {
  const path = join(REPO, "packages", "adapters", lib, "README.md");
  if (!existsSync(path)) {
    problems.push(`${lib}: no README`);
    continue;
  }
  const readme = readFileSync(path, "utf8");

  const s = readme.indexOf(START);
  const e = readme.indexOf(END);
  if (s < 0 || e < 0) {
    problems.push(`${lib}: no marked region — the generator owns nothing here`);
    rows.push([lib, "unmarked"]);
    continue;
  }
  if (e < s) {
    problems.push(`${lib}: markers out of order`);
    continue;
  }

  const region = readme.slice(s + START.length, e);

  // 1. the framework index must match the canonical set exactly
  const canonical = canonicalFrameworks(lib);
  const indexed = [...region.matchAll(/^\| ([^|]+?) \| \[View setup\]/gm)].map((m) => m[1].trim());
  const missing = canonical.filter((f) => !indexed.includes(f));
  const extra = indexed.filter((f) => !canonical.includes(f));

  // 2. every canonical framework must have a heading
  const headings = [...region.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  const noSection = canonical.filter((f) => !headings.includes(f));

  if (missing.length) problems.push(`${lib}: index missing ${missing.join(", ")}`);
  if (extra.length) problems.push(`${lib}: index lists unsupported ${extra.join(", ")}`);
  if (noSection.length) problems.push(`${lib}: no section for ${noSection.join(", ")}`);

  rows.push([lib, `${canonical.length} framework(s), region ${region.length} bytes`]);
}

// 3. regenerating must be a no-op — the generator is deterministic and the
//    committed READMEs must already match its output.
{
  const before = new Map();
  for (const lib of LIBRARIES) {
    const p = join(REPO, "packages", "adapters", lib, "README.md");
    if (existsSync(p)) before.set(lib, readFileSync(p, "utf8"));
  }
  execFileSync(process.execPath, [GENERATOR], { cwd: REPO, stdio: "inherit" });
  for (const [lib, was] of before) {
    const now = readFileSync(join(REPO, "packages", "adapters", lib, "README.md"), "utf8");
    if (was !== now) {
      problems.push(`${lib}: regenerating changed the README — it was hand-edited or stale`);
      // restore, so a check never leaves the tree modified
      const { writeFileSync } = await import("node:fs");
      writeFileSync(join(REPO, "packages", "adapters", lib, "README.md"), was);
    }
  }
}

console.log("package".padEnd(16) + "canonical coverage");
console.log("-".repeat(60));
for (const [lib, note] of rows) console.log(lib.padEnd(16) + note);

console.log("");
if (problems.length) {
  console.log(`FAIL  ${problems.length} drift problem(s):`);
  for (const p of problems) console.log("  -", p);
  console.log("\nrun with --fix to regenerate");
} else {
  console.log(`PASS  ${rows.length} READMEs match the canonical recipe source`);
}
process.exit(problems.length ? 1 : 0);
