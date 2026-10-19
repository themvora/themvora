import { describe, expect, it } from "vitest";
import { defineTheme, generateTheme, getBrandPresets, getBuiltInThemes, getPresetThemes } from "../src";
import { validateThemeLevels, type ValidationLevel } from "../src/generation";

const LEVELS: ValidationLevel[] = ["structural", "semantic", "contrast", "visual", "accessibility"];

function issuesAt(theme: Parameters<typeof validateThemeLevels>[0], level: ValidationLevel) {
  return validateThemeLevels(theme, { levels: [level] });
}

describe("validateThemeLevels — generated themes pass every level", () => {
  it("passes for a representative seed set", () => {
    for (const seed of ["#3b82f6", "#d97706", "#22c55e", "#7c3aed", "#000000", "#808080"]) {
      for (const mode of ["light", "dark"] as const) {
        const theme = generateTheme({ seed })[mode];
        const issues = validateThemeLevels(theme);
        expect(issues.map((i) => `${i.level}:${i.message}`), `${seed}/${mode}`).toEqual([]);
      }
    }
  });

  it("passes structural and semantic for every built-in theme", () => {
    const failures: string[] = [];
    for (const theme of getBuiltInThemes()) {
      for (const issue of validateThemeLevels(theme, { levels: ["structural", "semantic"] })) {
        failures.push(`${theme.name} ${issue.level} ${issue.message}`);
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("passes every text contrast pair in the shipped presets", () => {
    const failures: string[] = [];
    for (const theme of getBuiltInThemes()) {
      for (const issue of validateThemeLevels(theme, { levels: ["contrast"] })) {
        // Text pairs only — the UI pairs are handled by the next test.
        if (issue.message.includes("below 4.5:1")) failures.push(`${theme.name} ${issue.message}`);
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("records the shipped presets' UI-pair gap precisely (Phase 7 work)", () => {
    // **Phase 7.9 regression contract.**
    //
    // Before Phase 7 the shipped presets failed the UI gate on exactly
    // `{border, input, ring}` and this test pinned that set so it could not
    // silently widen. The presets are now generated from recipes and solved by
    // the same pipeline as `generateTheme()`, so the expected failing set is
    // **empty** — and it stays pinned, so a future change cannot reintroduce a
    // failure (or widen one) without this failing.
    const failing = new Set<string>();
    for (const theme of [...getPresetThemes(), ...getBrandPresets()]) {
      for (const issue of validateThemeLevels(theme)) {
        failing.add(`${theme.name} ${issue.level} ${issue.path ?? issue.message}`);
      }
    }

    expect([...failing]).toEqual([]);
  });

  it("pins the number of preset families so a preset cannot silently disappear", () => {
    expect(getPresetThemes()).toHaveLength(18); // 9 families × 2 modes
    expect(getBrandPresets()).toHaveLength(10); // 5 brands × 2 modes
  });

  it("gates every shipped theme except the accessibility profiles", () => {
    const shipped = getBuiltInThemes();
    const isExempt = (name: string) => /^(high-contrast|large-text)-/.test(name);

    // Everything that is not an accessibility profile must pass every level.
    const gatedFailures = shipped
      .filter((theme) => !isExempt(theme.name))
      .flatMap((theme) =>
        validateThemeLevels(theme).map((issue) => `${theme.name} ${issue.level} ${issue.path ?? issue.message}`),
      );
    expect(gatedFailures).toEqual([]);

    // The exemption is exactly four themes...
    const exemptThemes = shipped.filter((theme) => isExempt(theme.name));
    expect(exemptThemes.map((theme) => theme.name).sort()).toEqual([
      "high-contrast-dark",
      "high-contrast-light",
      "large-text-dark",
      "large-text-light",
    ]);

    // ...and it is not vacuous: they really do deviate, by design. A high-contrast
    // theme has zero surface separation and maximum contrast; a large-text profile
    // solves text to 3:1. If this ever stops being true, the exemption should be
    // removed rather than left in place.
    expect(exemptThemes.some((theme) => validateThemeLevels(theme).length > 0)).toBe(true);
  });
});

describe("validateThemeLevels — detection", () => {
  const base = generateTheme({ seed: "#3b82f6" }).light;

  it("flags a missing token at the structural level", () => {
    const colors = { ...(base.tokens?.colors as Record<string, string>) };
    delete colors.ring;
    const broken = defineTheme({ name: "broken", tokens: { colors } });

    const issues = issuesAt(broken, "structural");
    expect(issues.some((i) => i.code === "TV_THEME_TOKEN_MISSING" && i.path === "colors.ring")).toBe(true);
  });

  it("flags an invalid color at the structural level", () => {
    const colors = { ...(base.tokens?.colors as Record<string, string>), primary: "not-a-color" };
    const broken = defineTheme({ name: "broken", tokens: { colors } });

    const issues = issuesAt(broken, "structural");
    expect(issues.some((i) => i.code === "TV_THEME_TOKEN_INVALID" && i.path === "colors.primary")).toBe(true);
  });

  it("flags a status colour that left its family at the semantic level", () => {
    const colors = { ...(base.tokens?.colors as Record<string, string>), destructive: "#2563eb" };
    const broken = defineTheme({ name: "broken", tokens: { colors } });

    const issues = issuesAt(broken, "semantic");
    expect(issues.some((i) => i.path === "colors.destructive")).toBe(true);
  });

  it("flags a failing pair at the contrast level", () => {
    const colors = {
      ...(base.tokens?.colors as Record<string, string>),
      primaryForeground: "#ffffff",
      primary: "#93c5fd",
    };
    const broken = defineTheme({ name: "broken", tokens: { colors } });

    const issues = issuesAt(broken, "contrast");
    expect(issues.some((i) => i.code === "TV_A11Y_CONTRAST_VIOLATION")).toBe(true);
  });

  it("flags collapsed surfaces at the visual level", () => {
    const colors = {
      ...(base.tokens?.colors as Record<string, string>),
      card: base.tokens?.colors?.background as string,
    };
    const broken = defineTheme({ name: "broken", tokens: { colors } });

    const issues = issuesAt(broken, "visual");
    expect(issues.some((i) => i.message.includes("background") && i.message.includes("card"))).toBe(true);
  });

  it("flags a primary/accent collision at the visual level", () => {
    const colors = {
      ...(base.tokens?.colors as Record<string, string>),
      accent: base.tokens?.colors?.primary as string,
    };
    const broken = defineTheme({ name: "broken", tokens: { colors } });

    const issues = issuesAt(broken, "visual");
    expect(issues.some((i) => i.message.includes("accent"))).toBe(true);
  });

  it("runs only the requested levels", () => {
    const colors = { ...(base.tokens?.colors as Record<string, string>) };
    delete colors.ring;
    const broken = defineTheme({ name: "broken", tokens: { colors } });

    expect(issuesAt(broken, "structural").length).toBeGreaterThan(0);
    expect(issuesAt(broken, "contrast")).toHaveLength(0);
  });

  it("covers all five levels by default", () => {
    // A theme missing `tokens` entirely short-circuits to a structural issue.
    const broken = defineTheme({ name: "empty" });
    const issues = validateThemeLevels(broken);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.level).toBe("structural");
    expect(LEVELS).toContain(issues[0]?.level as ValidationLevel);
  });
});
