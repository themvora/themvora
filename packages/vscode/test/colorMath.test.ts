/**
 * WCAG contrast math for the Create drawer's live seed HUD.
 */
import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  parseHexColor,
  relativeLuminance,
  seedContrast,
  wcagLevel,
} from "../webview/studio/colorMath";

describe("parseHexColor", () => {
  it("parses short and long hex", () => {
    expect(parseHexColor("#fff")).toEqual({ red: 255, green: 255, blue: 255 });
    expect(parseHexColor("#4f46e5")).toEqual({ red: 79, green: 70, blue: 229 });
  });

  it("rejects non-hex and alpha forms", () => {
    expect(parseHexColor("4f46e5")).toBeNull();
    expect(parseHexColor("#4f46e580")).toBeNull();
    expect(parseHexColor("#4f46e")).toBeNull();
    expect(parseHexColor("red")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("is 1 for white and 0 for black", () => {
    expect(relativeLuminance({ red: 255, green: 255, blue: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ red: 0, green: 0, blue: 0 })).toBeCloseTo(0, 5);
  });
});

describe("contrastRatio", () => {
  it("is 21:1 between white and black", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
  });

  it("is symmetric and null-safe", () => {
    const a = contrastRatio("#0e1117", "#ffffff");
    const b = contrastRatio("#ffffff", "#0e1117");
    expect(a).toBeCloseTo(b as number, 3);
    expect(contrastRatio("nope", "#ffffff")).toBeNull();
  });
});

describe("wcagLevel", () => {
  it("maps ratios to tiers", () => {
    expect(wcagLevel(11.2)).toBe("AAA");
    expect(wcagLevel(7)).toBe("AAA");
    expect(wcagLevel(5)).toBe("AA");
    expect(wcagLevel(3.2)).toBe("AA Large");
    expect(wcagLevel(2)).toBe("Fail");
  });
});

describe("seedContrast", () => {
  it("takes the strongest surface", () => {
    expect(seedContrast("#4f46e5")).not.toBeNull();
    expect(seedContrast("nope")).toBeNull();
  });
});
