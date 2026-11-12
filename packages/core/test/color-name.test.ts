import { describe, expect, it } from "vitest";

import { colorName } from "../src/color/index";

describe("colorName()", () => {
  it("names a hue the way people name that colour", () => {
    // Values chosen from the standard ramp, one per region of the OKLCH wheel.
    expect(colorName("#6366f1")).toBe("indigo");
    expect(colorName("#f59e0b")).toBe("amber");
    expect(colorName("#10b981")).toBe("emerald");
    expect(colorName("#3b82f6")).toBe("blue");
    expect(colorName("#ef4444")).toBe("red");
    expect(colorName("#ec4899")).toBe("rose");
  });

  it("qualifies the tone at the ends of the lightness range", () => {
    expect(colorName("#7c2d12")).toBe("deepRed");
    expect(colorName("#fecaca")).toBe("paleRose");
  });

  it("names near-neutrals by tone instead of inventing a hue", () => {
    expect(colorName("#ffffff")).toBe("ash");
    expect(colorName("#0b0b0f")).toBe("slate");
  });

  it("returns a letters-only token, so it is safe as an identifier stem", () => {
    for (const seed of [
      "#6366f1",
      "#f59e0b",
      "#10b981",
      "#ef4444",
      "#a855f7",
      "#64748b",
      "#ffffff",
      "#0b0b0f",
      "#7c2d12",
      "#e2e8f0",
    ]) {
      const name = colorName(seed);
      expect(name).toMatch(/^[A-Za-z]+$/);
    }
  });

  it("returns null for a string that is not a colour", () => {
    expect(colorName("not a colour")).toBeNull();
    expect(colorName("#f2fde")).toBeNull();
    expect(colorName("")).toBeNull();
  });

  it("follows the parser's contract for hex strings", () => {
    // Case-insensitive, and the leading `#` is required — the same contract as
    // `hexToOklch`, so a caller does not have to normalise first.
    expect(colorName("#6366F1")).toBe("indigo");
    expect(colorName("6366f1")).toBeNull();
  });
});
