/**
 * Envelope and exit-code tests.
 *
 * The exit-code values are duplicated from the CLI on purpose — importing
 * `@themvora/cli` would pull its `node:fs` graph into the bundle — so this test
 * reads the CLI's source and fails the moment the two disagree. That is the
 * whole reason the duplication is acceptable.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { OUTCOME_EXIT_CODES, resultOf } from "../src/domain/outcome";

/** The CLI module that owns the canonical exit codes. */
const CLI_EXIT_CODES = fileURLToPath(new URL("../../cli/src/exit-codes.ts", import.meta.url));
const present = existsSync(CLI_EXIT_CODES);

/**
 * Read one code out of the CLI's `ExitCodes` literal.
 *
 * @param source - The CLI source.
 * @param key - The property name.
 * @returns Its numeric value.
 */
function cliCode(source: string, key: string): number {
  const match = new RegExp(`${key}:\\s*(\\d+)`).exec(source);
  if (!match) throw new Error(`could not read ${key} from the CLI's ExitCodes`);
  return Number(match[1]);
}

describe.skipIf(!present)("exit-code parity with @themvora/cli", () => {
  const source = present ? readFileSync(CLI_EXIT_CODES, "utf8") : "";

  it("maps every outcome to the CLI's documented code", () => {
    expect(OUTCOME_EXIT_CODES.ok).toBe(cliCode(source, "OK"));
    expect(OUTCOME_EXIT_CODES.error).toBe(cliCode(source, "Error"));
    expect(OUTCOME_EXIT_CODES.usage).toBe(cliCode(source, "Usage"));
    expect(OUTCOME_EXIT_CODES["validation-failed"]).toBe(cliCode(source, "ValidationFailed"));
  });

  it("has no code for situations the CLI never produces", () => {
    // A cancelled operation was killed rather than exited; an unavailable
    // capability never ran. Inventing a code for either would be a lie.
    expect(OUTCOME_EXIT_CODES.cancelled).toBeNull();
    expect(OUTCOME_EXIT_CODES.unavailable).toBeNull();
  });
});

describe("resultOf", () => {
  it("marks only `ok` as ok", () => {
    expect(resultOf("ok", 1).ok).toBe(true);
    for (const outcome of ["error", "usage", "validation-failed", "cancelled", "unavailable"] as const) {
      expect(resultOf(outcome, 1).ok).toBe(false);
    }
  });

  it("marks only `unavailable` as skipped", () => {
    expect(resultOf("unavailable", 1, { reason: "no" }).skipped).toBe(true);
    expect(resultOf("cancelled", 1, { reason: "no" }).skipped).toBe(false);
  });

  it("carries a value through a failed validation", () => {
    // The report is useful precisely when the theme is invalid, so a
    // `validation-failed` result keeps its value.
    const result = resultOf("validation-failed", 5, { value: { valid: false }, errors: [] });
    expect(result.ok).toBe(false);
    expect(result.value).toEqual({ valid: false });
    expect(result.exitCode).toBe(3);
  });

  it("defaults every collection rather than leaving it undefined", () => {
    const result = resultOf("ok", 0);
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.reason).toBeNull();
    expect(result.value).toBeNull();
  });
});
