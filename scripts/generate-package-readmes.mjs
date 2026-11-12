#!/usr/bin/env node
/**
 * Writes the README of every published UI-library adapter package.
 *
 * ## One source of truth
 *
 * The integration content — install commands, prerequisites, build
 * configuration, provider mounting, adapter wiring, component example, theme
 * controls, family switching and the assembled app — is read from the *same*
 * table the documentation page renders:
 *
 *     apps/docs/lib/libraries.tsx → FRAMEWORK_RECIPES
 *
 * The docs page presents that table interactively (a framework selector); the
 * README presents it statically (one section per framework). Same recipe, two
 * presentations. Nothing is transcribed by hand, so the two cannot drift.
 *
 * Install commands are not rewritten either. They are passed through
 * `forManager()` from `apps/docs/lib/install-commands.ts` — the exact function
 * the documentation's package-manager tabs use — so `pnpm add` becomes
 * `npm install`, `yarn add` and `bun add` here precisely as it does there.
 *
 * ## Idempotence
 *
 * The output is a pure function of the canonical data: no timestamps, no
 * environment, no ordering that depends on the filesystem. `--check` compares
 * bytes, which is why the adapter READMEs are pinned to LF in `.gitattributes` —
 * with `core.autocrlf=true` a byte comparison would otherwise report drift that
 * does not exist.
 *
 * The rendering itself lives in `scripts/readme/render.mjs`, so this file is
 * only the file I/O.
 *
 * Usage:
 *   node scripts/generate-package-readmes.mjs            # write
 *   node scripts/generate-package-readmes.mjs --check     # fail on drift
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { REPO } from "./readme/canonical.mjs";
import { SLUGS, frameworksOf, renderReadme } from "./readme/render.mjs";

const CHECK = process.argv.includes("--check");

const results = [];
for (const slug of SLUGS) {
  const dir = join(REPO, "packages", "adapters", slug);
  const readmePath = join(dir, "README.md");

  if (!existsSync(join(dir, "package.json"))) {
    results.push([slug, "no package.json — skipped"]);
    continue;
  }

  const next = renderReadme(slug);
  const current = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : null;

  if (current === next) {
    results.push([slug, "unchanged"]);
    continue;
  }

  if (CHECK) {
    results.push([slug, "OUT OF DATE"]);
    continue;
  }

  writeFileSync(readmePath, next);
  results.push([
    slug,
    `${frameworksOf(slug).length} framework(s), ${next.split("\n").length} lines`,
  ]);
}

for (const [slug, status] of results) console.log(`  ${slug.padEnd(12)} ${status}`);

const stale = results.filter(([, status]) => status === "OUT OF DATE");
if (CHECK) {
  if (stale.length) {
    console.error(
      `\nFAIL  ${stale.length} README(s) stale: ${stale.map(([s]) => s).join(", ")}`,
    );
    console.error("Run `pnpm docs:sync-library-readmes` to regenerate them.");
    process.exit(1);
  }
  console.log(`\nOK  ${results.length} READMEs match the canonical recipe source.`);
}
