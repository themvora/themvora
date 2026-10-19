#!/usr/bin/env node
/**
 * Runs the repository's ESLint.
 *
 * A thin wrapper rather than `eslint .` directly, because two callers need
 * different things from the same command:
 *
 *   - the release gate spawns `node <script>` for every step, so a step has to be
 *     a script path — a bare binary name would be resolved as `<root>/eslint`.
 *   - the `lint` npm script goes through pnpm, which puts `node_modules/.bin` on
 *     PATH.
 *
 * Both end up here, so both lint exactly the same surface with the same config.
 * `stdio: "inherit"` keeps ESLint's own formatting intact and avoids the piped
 * stdio problem this host has.
 *
 * @see eslint.config.mjs — the rules, and why the surface is `.mjs` only
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "..");
const bin = join(repoRoot, "node_modules", "eslint", "bin", "eslint.js");

if (!existsSync(bin)) {
  console.error(
    `ESLint is not installed at ${bin}.\nRun the install step for this repo first.`,
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2), "."], {
  stdio: "inherit",
  cwd: repoRoot,
  env: process.env,
});

process.exit(result.status ?? 1);
