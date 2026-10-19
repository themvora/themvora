import { describe, expect, it } from "vitest";
import { buildGenerationReport, GENERATION_STYLE_NAMES } from "../src/generation";

describe("buildGenerationReport", () => {
  it("reports both modes with every contract pair passing", () => {
    const report = buildGenerationReport("#3b82f6");

    expect(report.algorithm).toBe("semantic-v2");
    expect(report.seed).toBe("#3b82f6");
    expect(report.style).toBe("balanced");

    for (const mode of ["light", "dark"] as const) {
      const section = report.modes[mode];
      expect(section.contrast.length).toBeGreaterThan(0);
      for (const row of section.contrast) {
        expect(row.passes, `${mode} ${row.pair} ${row.ratio}`).toBe(true);
        expect(row.ratio).toBeGreaterThanOrEqual(row.target);
      }
      expect(section.unsatisfied).toEqual([]);
      expect(section.relationshipIssues).toEqual([]);
    }
  });

  it("reports the brand hue surviving the mode change", () => {
    const report = buildGenerationReport("#7c3aed");

    expect(report.identity.primaryHueDrift).toBeLessThanOrEqual(1);
    expect(report.identity.temperatureStable).toBe(true);
  });

  it("reports palette characteristics", () => {
    const report = buildGenerationReport("#22c55e", "vibrant");

    expect(report.style).toBe("vibrant");
    expect(report.modes.light.palette.primaryChroma).toBeGreaterThan(0);
    expect(report.modes.light.palette.accentHueDistance).toBeGreaterThanOrEqual(18);
    expect(report.modes.light.palette.surfaceSeparation).toBeGreaterThan(0);
    expect(report.modes.light.palette.statusSeparation).toBeGreaterThan(0);
  });

  it("records the repairs it made", () => {
    // #3b82f6 needs a primary-foreground repair, so adjustments must be present.
    const report = buildGenerationReport("#3b82f6");
    expect(report.modes.light.adjustments.length).toBeGreaterThan(0);
    for (const adjustment of report.modes.light.adjustments) {
      expect(adjustment.after).toBeGreaterThanOrEqual(adjustment.before);
    }
  });

  it("works for every style", () => {
    for (const style of GENERATION_STYLE_NAMES) {
      const report = buildGenerationReport("#d97706", style);
      expect(report.style).toBe(style);
      for (const mode of ["light", "dark"] as const) {
        expect(report.modes[mode].contrast.every((row) => row.passes), `${style}/${mode}`).toBe(true);
      }
    }
  });
});
