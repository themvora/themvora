/**
 * Re-capture the Phase 0 CLI fixtures for `themvora generate`.
 *
 * The fixtures are the literal stdout of the CLI and are asserted against the
 * runtime generator in `packages/core/test/cli-fixtures.test.ts`. They are only
 * re-captured when the generator is *intentionally* changed — never to make a
 * test pass. Any diff must be explained in the Agent Log of `theme-generation.md`.
 *
 * Requires the packages to be built (`packages/core/dist`, `packages/cli/dist`),
 * because the CLI consumes `@themvora/core` through its published entry.
 *
 * Usage: node scripts/capture-cli-baseline.mjs
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..");
const CLI = join(REPO, "packages", "cli", "dist", "cli.js");
const OUT = join(REPO, "packages", "core", "test", "__baseline__", "cli");

/** [fixture name, argv tail] — argv tail is everything after `generate`. */
const CASES = [
  ["both-indigo.json", ["--seed", "#6366f1", "--family", "indigo"]],
  ["light-indigo.json", ["--seed", "#6366f1", "--family", "indigo", "--mode", "light"]],
  ["dark-indigo.json", ["--seed", "#6366f1", "--family", "indigo", "--mode", "dark"]],
  ["light-plum.json", ["--seed", "#6d28d9", "--family", "plum", "--mode", "light"]],
  ["both-oat-code.json", ["--seed", "#d97706", "--family", "oat", "--mode", "both", "--code"]],
  ["light-indigo-editorial.json", ["--seed", "#6366f1", "--family", "indigo", "--mode", "light", "--style", "editorial"]],
];

mkdirSync(OUT, { recursive: true });

for (const [name, argv] of CASES) {
  // Piped child stdio is unreliable on this host (EBUSY), so the CLI's stdout is
  // wired straight to an open file descriptor instead of being captured in JS.
  const fd = openSync(join(OUT, name), "w");
  try {
    execFileSync(process.execPath, [CLI, "generate", ...argv], {
      stdio: ["ignore", fd, "inherit"],
      cwd: REPO,
    });
  } finally {
    closeSync(fd);
  }
  console.log(`captured ${name}`);
}
