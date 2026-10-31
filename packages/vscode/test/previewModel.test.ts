/**
 * Preview-model tests.
 *
 * The model is pure, so everything the preview decides about a theme — which
 * variant, what it renders, whether it is allowed to render at all — is asserted
 * here, without a host or a browser.
 */
import { generateTheme, getContrastRatio, type ThemeDefinition } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { buildPreviewModel } from "../src/domain/previewModel";

const BASE = generateTheme({ seed: "#4f46e5" }).light;
const DARK = generateTheme({ seed: "#4f46e5" }).dark;

const DERIVED: ThemeDefinition = {
  name: "brand-dark",
  extends: BASE.name,
  meta: { family: "brand", mode: "dark" },
  tokens: { colors: { primary: "#ff0000" } },
};

/** Build a model, asserting it succeeded. */
function modelOf(themes: readonly ThemeDefinition[], mode: "light" | "dark" = "light") {
  const result = buildPreviewModel({ themes, mode, source: "theme.json" });
  if (!result.ok) throw new Error(`expected a model, got: ${result.message}`);
  return result.model;
}

describe("a light/dark pair", () => {
  it("offers both modes and renders the requested one", () => {
    const model = modelOf([BASE, DARK], "light");

    expect(model.mode).toBe("light");
    expect(model.modes).toEqual(["light", "dark"]);
    expect(model.systemMode).toBe(false);
    expect(model.themeName).toBe("generated-light");
    expect(model.family).toBe("generated");
  });

  it("renders the dark variant when asked", () => {
    const model = modelOf([BASE, DARK], "dark");

    expect(model.mode).toBe("dark");
    expect(model.variables["--theme-color-background"]).toBe(DARK.tokens!.colors!["background"]);
  });

  it("carries every variable core projects", () => {
    const model = modelOf([BASE, DARK]);

    expect(Object.keys(model.variables)).toHaveLength(22);
    expect(model.roles).toHaveLength(21);
    // Every role resolves — the token table can never show a row of dashes for a
    // valid theme.
    expect(model.roles.every((role) => role.value !== null)).toBe(true);
  });

  it("names each role's custom property exactly as core does", () => {
    const model = modelOf([BASE, DARK]);

    for (const role of model.roles) {
      expect(role.variable).toBe(`--theme-color-${role.role}`);
      expect(model.variables[role.variable]).toBe(role.value);
    }
  });

  it("reports core's contrast summary verbatim", () => {
    expect(modelOf([BASE, DARK]).contrast).toBe("16 pairs · text 9/9 · ui 7/7");
  });

  it("keeps the source label it was given", () => {
    expect(modelOf([BASE, DARK]).source).toBe("theme.json");
  });
});

describe("a theme that extends another", () => {
  it("renders inherited values as well as the override", () => {
    const model = modelOf([BASE, DERIVED], "dark");

    expect(model.themeName).toBe("brand-dark");
    expect(Object.keys(model.variables)).toHaveLength(22);
    expect(model.variables["--theme-color-primary"]).toBe("#ff0000");
    expect(model.variables["--theme-color-background"]).toBe(BASE.tokens!.colors!["background"]);
  });

  it("measures contrast on the resolved theme", () => {
    expect(modelOf([BASE, DERIVED], "dark").contrast).not.toContain("0 pairs");
  });

  it("refuses when the base is missing", () => {
    const orphan: ThemeDefinition = { name: "orphan", extends: "nope", tokens: {} };
    const result = buildPreviewModel({ themes: [orphan], mode: "light", source: "x.json" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("not registered");
  });

  it("refuses when two themes share the name it must resolve", () => {
    const first: ThemeDefinition = { name: "dup", tokens: { colors: { primary: "#111111" } } };
    const second: ThemeDefinition = {
      name: "dup",
      extends: "dup",
      tokens: { colors: { primary: "#222222" } },
    };
    // The extending theme is the one mode selection reaches first, so the
    // duplicate name has to be resolved.
    const result = buildPreviewModel({ themes: [second, first], mode: "light", source: "x.json" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("ambiguous");
  });
});

describe("refusals", () => {
  it("refuses a theme that does not validate", () => {
    const broken: ThemeDefinition = { name: "broken", tokens: { colors: { primary: "#123456" } } };
    const result = buildPreviewModel({ themes: [broken], mode: "light", source: "x.json" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Names the role and points at the command that explains it.
    expect(result.message).toContain("is not valid");
    expect(result.message).toContain("Validate Theme");
  });

  it("refuses an empty document", () => {
    const result = buildPreviewModel({ themes: [], mode: "light", source: "empty.json" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("no themes");
  });

  it("says which modes are available when the requested one is missing", () => {
    const third: ThemeDefinition = {
      name: "third-light",
      meta: { mode: "light" },
      tokens: BASE.tokens!,
    };
    // Two light themes, no dark: asking for dark cannot be satisfied by either
    // and the document is not a single theme either.
    const result = buildPreviewModel({
      themes: [BASE, third],
      mode: "dark",
      source: "x.json",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("no dark theme");
  });
});

describe("mode selection", () => {
  it("renders a lone dark theme as dark even when light was requested", () => {
    const model = modelOf([DARK], "light");

    // The header must say dark, because that is what is on screen.
    expect(model.mode).toBe("dark");
    expect(model.modes).toEqual(["dark"]);
  });

  it("resolves a system theme to the requested mode and says so", () => {
    const system: ThemeDefinition = {
      ...BASE,
      name: "system-theme",
      meta: { mode: "system" },
      tokens: BASE.tokens!,
    };

    const asLight = modelOf([system], "light");
    const asDark = modelOf([system], "dark");

    expect(asLight.mode).toBe("light");
    expect(asLight.systemMode).toBe(true);
    expect(asDark.mode).toBe("dark");
    expect(asDark.systemMode).toBe(true);
    // Same tokens either way: `system` is a selector, not a second palette.
    expect(asDark.variables).toEqual(asLight.variables);
  });

  it("prefers an exact mode match over a system theme", () => {
    const system: ThemeDefinition = {
      ...BASE,
      name: "system-theme",
      meta: { mode: "system" },
      tokens: BASE.tokens!,
    };
    const model = modelOf([system, DARK], "dark");

    expect(model.themeName).toBe("generated-dark");
    expect(model.systemMode).toBe(false);
  });
});

describe("readable foregrounds", () => {
  it("never chooses a foreground worse than the theme's own pairing", () => {
    const model = modelOf([BASE, DARK], "light");

    for (const [surface, foreground] of Object.entries(model.readable)) {
      const background = model.variables[`--theme-color-${surface}`];
      if (background === undefined) continue;

      const chosen = getContrastRatio(foreground, background);
      const declared = model.variables[`--theme-color-${surface}Foreground`];
      const paired = declared === undefined ? 0 : getContrastRatio(declared, background);

      // The point of the map: never worse than what the theme declared.
      expect(chosen).toBeGreaterThanOrEqual(paired - 0.001);
    }
  });

  it("keeps status badges readable on a light green", () => {
    // A light success with near-white text is the case that made the pills
    // unreadable in a real theme.
    const theme: ThemeDefinition = {
      ...BASE,
      tokens: {
        ...BASE.tokens,
        colors: { ...BASE.tokens?.colors, success: "#a8e6b8", successForeground: "#fcfbfc" },
      },
    };

    const model = modelOf([theme], "light");
    const onSuccess = model.readable.success;
    expect(onSuccess).toBeDefined();
    expect(getContrastRatio(onSuccess!, "#a8e6b8")).toBeGreaterThan(4.5);
  });
});
