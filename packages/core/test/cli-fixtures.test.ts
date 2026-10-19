import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateTheme } from "../src";

/**
 * Phase 0 CLI fixtures + Phase 8 cross-surface equivalence.
 *
 * These files are the literal stdout of `themvora generate`, captured in Phase 0
 * before any algorithm change. Asserting the runtime generator reproduces them
 * proves the CLI and the runtime share one engine — the CLI has no formulas of
 * its own. When the generator is intentionally upgraded, re-run
 * `scripts/capture-cli-baseline.mjs` and explain the diff in the Agent Log.
 */

const CLI_DIR = join(import.meta.dirname, "__baseline__", "cli");

function readFixture(name: string) {
  return JSON.parse(readFileSync(join(CLI_DIR, name), "utf8"));
}

describe("CLI generate fixtures === runtime generateTheme", () => {
  it("`--seed #6366f1 --family indigo` (both modes)", () => {
    expect(readFixture("both-indigo.json")).toEqual(
      generateTheme({ seed: "#6366f1", family: "indigo" }),
    );
  });

  it("`--mode light` prints the light theme", () => {
    expect(readFixture("light-indigo.json")).toEqual(
      generateTheme({ seed: "#6366f1", family: "indigo" }).light,
    );
  });

  it("`--mode dark` prints the dark theme", () => {
    expect(readFixture("dark-indigo.json")).toEqual(
      generateTheme({ seed: "#6366f1", family: "indigo" }).dark,
    );
  });

  it("`--seed #6d28d9 --family plum --mode light`", () => {
    expect(readFixture("light-plum.json")).toEqual(
      generateTheme({ seed: "#6d28d9", family: "plum" }).light,
    );
  });

  it("`--code` includes the opt-in syntax palette", () => {
    expect(readFixture("both-oat-code.json")).toEqual(
      generateTheme({ seed: "#d97706", family: "oat", withCode: true }),
    );
  });

  it("`--style editorial` selects the style", () => {
    expect(readFixture("light-indigo-editorial.json")).toEqual(
      generateTheme({ seed: "#6366f1", family: "indigo", style: "editorial" }).light,
    );
  });
});
