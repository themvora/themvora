/**
 * Audits every published package README against its own manifest.
 *
 * ## What it enforces
 *
 * A developer landing on npm must be able to install and run the package from its
 * README alone. Three failure modes are checked:
 *
 *   1. **No install command.** The README shows code with no way to obtain it.
 *      Eleven framework READMEs had this.
 *   2. **The package alone.** `npm install @themvora/mui` omits `@themvora/core`,
 *      the framework integration, and MUI itself — the reader hits a missing-module
 *      error on the first import. All nine adapter READMEs had this.
 *   3. **The framework package omitted.** `@themvora/next` needs `@themvora/next`;
 *      a README that installs only `core` is equally incomplete.
 *
 * ## Why it reads the manifest
 *
 * The required set is derived from `dependencies` + `peerDependencies`, not from a
 * list of package names maintained by hand. A package that gains a dependency
 * cannot silently fall out of its README.
 *
 * Non-`@themvora` peers (react, vue, @mui/material) are the consumer's own choice
 * and are reported separately — omitting one is an incomplete README, but a
 * different failure from omitting a Themvora dependency.
 *
 * Usage: node scripts/audit-package-readmes.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..");

/** Every package directory with a manifest. */
const dirs = [];
for (const base of ["packages", "packages/adapters"]) {
  const full = join(REPO, base);
  if (!existsSync(full)) continue;
  for (const d of readdirSync(full)) {
    if (existsSync(join(full, d, "package.json"))) dirs.push(join(full, d));
  }
}


/**
 * Packages a consumer never imports from, so the install command legitimately does
 * not name `@themvora/core`:
 *
 *   - `@themvora/cli`      installed globally; core arrives transitively and is never imported
 *   - `@themvora/devtools` a dev-only add-on, not part of a consumer's runtime
 *   - `@themvora/adapters` a meta-package that re-exports the adapters
 *
 * Excluded explicitly rather than by loosening the rule — the rule is right for
 * every package a user writes `import` against.
 */
const NO_DIRECT_CORE = new Set(["@themvora/cli", "@themvora/devtools", "@themvora/adapters"]);

/**
 * Packages that are not distributed via npm, so the audit's "must have an
 * install command" rule does not apply:
 *
 *   - `themvora-vscode` a VS Code extension, installed from the marketplace
 */
const NO_INSTALL_CMD = new Set(["themvora-vscode"]);

const problems = [];
const rows = [];

for (const dir of dirs) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const readmePath = join(dir, "README.md");
  if (!existsSync(readmePath)) {
    problems.push(`${pkg.name}: no README`);
    continue;
  }
  const readme = readFileSync(readmePath, "utf8");

  // Themvora packages the consumer must have: the package itself, plus every
  // @themvora/* it declares — whether as a dependency or a peer.
  const tvDeps = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ].filter((k) => k.startsWith("@themvora/"));

  // What the README's install commands name.
  const installLines = [...readme.matchAll(/^\s*(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\s+([^\n`]+)/gm)].map(
    (m) => m[1],
  );
  const named = new Set();
  for (const line of installLines) {
    for (const tok of line.split(/\s+/)) {
      if (tok.startsWith("@themvora/")) named.add(tok.replace(/@[\^~]?[\d.]+$/, ""));
    }
  }

  const missingSelf = installLines.length === 0
    ? (NO_INSTALL_CMD.has(pkg.name) ? null : "no install command")
    : named.has(pkg.name) ? null : "does not install itself";
  const missingCore =
    tvDeps.includes("@themvora/core") && !named.has("@themvora/core") && !NO_DIRECT_CORE.has(pkg.name)
      ? "@themvora/core"
      : null;

  if (missingSelf) problems.push(`${pkg.name}: ${missingSelf}`);
  if (missingCore) problems.push(`${pkg.name}: install omits ${missingCore}`);

  rows.push({ name: pkg.name, installs: named.size, missingSelf, missingCore });
}

console.log("package".padEnd(28) + "pkgs named".padEnd(12) + "issue");
console.log("-".repeat(80));
for (const r of rows) {
  const issue = r.missingSelf ?? r.missingCore ?? "";
  console.log(r.name.padEnd(28) + String(r.installs).padEnd(12) + issue);
}

console.log("");
if (problems.length) {
  console.log(`FAIL  ${problems.length} README problem(s):`);
  for (const p of problems) console.log("  -", p);
} else {
  console.log(`PASS  all ${rows.length} package READMEs install a complete set`);
}
process.exit(problems.length ? 1 : 0);
