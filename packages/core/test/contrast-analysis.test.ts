import { describe, expect, it } from "vitest";
import {
  analyzeContrastDirection,
  classifyContrastSeverity,
} from "../src/generation/scorecard";

describe("classifyContrastSeverity", () => {
  it("returns undefined when the pair passes", () => {
    expect(classifyContrastSeverity(4.5, 4.5)).toBeUndefined();
    expect(classifyContrastSeverity(7.0, 4.5)).toBeUndefined();
  });

  it("classifies near-miss (within 0.3 of floor)", () => {
    expect(classifyContrastSeverity(4.3, 4.5)).toBe("near-miss");
    expect(classifyContrastSeverity(4.2, 4.5)).toBe("near-miss");
    expect(classifyContrastSeverity(2.8, 3.0)).toBe("near-miss");
  });

  it("classifies moderate (0.3–1.0 below floor)", () => {
    expect(classifyContrastSeverity(4.0, 4.5)).toBe("moderate");
    expect(classifyContrastSeverity(3.6, 4.5)).toBe("moderate");
    expect(classifyContrastSeverity(2.5, 3.0)).toBe("moderate");
  });

  it("classifies critical (more than 1.0 below floor)", () => {
    expect(classifyContrastSeverity(3.0, 4.5)).toBe("critical");
    expect(classifyContrastSeverity(2.0, 4.5)).toBe("critical");
    expect(classifyContrastSeverity(1.5, 3.0)).toBe("critical");
  });
});

describe("analyzeContrastDirection", () => {
  it("returns undefined when the pair passes", () => {
    expect(analyzeContrastDirection(0.8, 0.2, 5.0, 4.5)).toBeUndefined();
  });

  it("returns foreground-too-light when foreground is lighter but ratio fails", () => {
    // Foreground luminance 0.6, background 0.4, ratio fails
    expect(analyzeContrastDirection(0.6, 0.4, 2.0, 4.5)).toBe("foreground-too-light");
  });

  it("returns foreground-too-dark when foreground is darker but ratio fails", () => {
    // Foreground luminance 0.3, background 0.5, ratio fails
    expect(analyzeContrastDirection(0.3, 0.5, 2.0, 4.5)).toBe("foreground-too-dark");
  });

  it("handles edge case where luminances are equal", () => {
    // When luminances are equal, foreground is not lighter, so it's "too dark"
    expect(analyzeContrastDirection(0.5, 0.5, 1.0, 4.5)).toBe("foreground-too-dark");
  });
});
