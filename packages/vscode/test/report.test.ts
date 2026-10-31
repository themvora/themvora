/**
 * Contrast reporting tests.
 *
 * The counts asserted here come from core's own measurement of a generated
 * theme, not from a fixture. That is the point: the extension formats what the
 * engine measured, and this test fails if the two ever disagree.
 */
import { generateTheme, measureThemeContrast } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { describeContrast, summariseContrast } from "../src/domain/report";

const { light, dark } = generateTheme({ seed: "#4f46e5" });

describe("summariseContrast", () => {
  it("tallies every measured pair exactly once", () => {
    const summary = summariseContrast(measureThemeContrast(light));

    expect(summary.pairs).toBe(16);
    expect(summary.text.total).toBe(9);
    expect(summary.ui.total).toBe(7);
    expect(summary.text.total + summary.ui.total).toBe(summary.pairs);
  });

  it("reports a generated theme as fully passing", () => {
    // `generateTheme` solves the contrast contract before returning, so a
    // generated theme that does not pass here means the solver regressed.
    for (const theme of [light, dark]) {
      const summary = summariseContrast(measureThemeContrast(theme));
      expect(summary.text.passing).toBe(summary.text.total);
      expect(summary.ui.passing).toBe(summary.ui.total);
    }
  });

  it("reports zero pairs for a theme with nothing to measure", () => {
    const summary = summariseContrast([]);
    expect(summary).toEqual({ pairs: 0, text: { total: 0, passing: 0 }, ui: { total: 0, passing: 0 } });
  });
});

describe("describeContrast", () => {
  it("matches the wording the CLI's inspect and validate use", () => {
    expect(
      describeContrast({ pairs: 16, text: { total: 9, passing: 9 }, ui: { total: 7, passing: 7 } }),
    ).toBe("16 pairs · text 9/9 · ui 7/7");
  });

  it("renders a failure as a numerator below the denominator", () => {
    expect(
      describeContrast({ pairs: 16, text: { total: 9, passing: 8 }, ui: { total: 7, passing: 6 } }),
    ).toBe("16 pairs · text 8/9 · ui 6/7");
  });
});
