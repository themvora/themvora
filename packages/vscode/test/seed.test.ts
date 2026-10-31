/**
 * Seed normalisation tests.
 *
 * These encode the one behaviour the prompt adds over core: a bare six-digit hex
 * is accepted and normalised, because an input box is not a shell.
 */
import { describe, expect, it } from "vitest";

import { isValidSeed, normaliseSeed } from "../src/domain/seed";

describe("normaliseSeed", () => {
  it("keeps a canonical seed unchanged", () => {
    expect(normaliseSeed("#4f46e5")).toBe("#4f46e5");
  });

  it("adds the missing hash", () => {
    expect(normaliseSeed("4f46e5")).toBe("#4f46e5");
  });

  it("lowercases the digits", () => {
    expect(normaliseSeed("4F46E5")).toBe("#4f46e5");
    expect(normaliseSeed("#4F46E5")).toBe("#4f46e5");
  });

  it("trims surrounding whitespace", () => {
    expect(normaliseSeed("  #4F46E5\n")).toBe("#4f46e5");
  });

  it.each([
    ["", "an empty string"],
    ["#4f46e", "five digits"],
    ["#4f46e55", "seven digits"],
    ["#4f46e5ff", "eight digits"],
    ["#gggggg", "non-hex digits"],
    ["rebeccapurple", "a named colour"],
    ["rgb(79, 70, 229)", "an rgb() colour"],
    ["#4f46e5;", "trailing punctuation"],
  ])("rejects %s (%s)", (input) => {
    expect(normaliseSeed(input)).toBeNull();
  });
});

describe("isValidSeed", () => {
  it("agrees with normaliseSeed", () => {
    for (const input of ["#4f46e5", "4f46e5", "  #FFFFFF  ", "", "#4f46e", "blue"]) {
      expect(isValidSeed(input)).toBe(normaliseSeed(input) !== null);
    }
  });
});
