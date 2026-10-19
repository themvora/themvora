import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getBrandPresets,
  getBuiltInThemes,
  getNeutralThemes,
  getPresetCatalog,
  getPresetThemes,
  scoreTheme,
  type ThemeDefinition,
} from "../src";
// The recipe construction API is internal by design; tests reach it directly.
import {
  buildPresetTheme,
  BRAND_PRESET_RECIPES,
  DEFAULT_PRESET_RECIPES,
} from "../src/preset-recipes";

/**
 * Phase 8.16 / 8.17 — the architectural invariants.
 *
 * These protect the decision Phase 7 made: **presets are curated inputs to the
 * generator**, not a second catalog of hand-authored palettes. A regression here
 * is not a wrong colour — it is a reintroduced second source of truth.
 */

const RECIPE_FILES = [
  join(import.meta.dirname, "..", "src", "preset-recipes", "defaults.ts"),
  join(import.meta.dirname, "..", "src", "preset-recipes", "brands.ts"),
];

function colorsOf(theme: ThemeDefinition): Record<string, string> {
  return (theme.tokens?.colors ?? {}) as Record<string, string>;
}

describe("recipe → generated theme invariant", () => {
  it("every ordinary shipped preset is reproducible from its recipe", () => {
    const shipped = new Map(getBuiltInThemes().map((theme) => [theme.name, theme]));
    const failures: string[] = [];

    for (const recipe of [...DEFAULT_PRESET_RECIPES, ...BRAND_PRESET_RECIPES]) {
      for (const mode of ["light", "dark"] as const) {
        const name = `${recipe.family}-${mode}`;
        const rebuilt = buildPresetTheme(recipe, mode);
        const actual = shipped.get(name);

        if (!actual) {
          failures.push(`${name}: not in the shipped set`);
          continue;
        }
        if (JSON.stringify(actual.tokens?.colors) !== JSON.stringify(rebuilt.tokens?.colors)) {
          failures.push(`${name}: shipped tokens differ from recipe output`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("no shipped default or brand theme originates from anything but a recipe", () => {
    // The reverse direction: a theme in the shipped set whose family matches a
    // recipe but which is not byte-identical to that recipe's output means a
    // hand-authored object was reintroduced alongside the generated one.
    const recipeFamilies = new Set(
      [...DEFAULT_PRESET_RECIPES, ...BRAND_PRESET_RECIPES].map((recipe) => recipe.family),
    );
    const generated = new Map(
      [...getPresetThemes(), ...getBrandPresets()].map((theme) => [theme.name, theme]),
    );

    const orphans = getBuiltInThemes()
      .filter((theme) => recipeFamilies.has(theme.meta?.family ?? ""))
      .filter((theme) => {
        const fromRecipe = generated.get(theme.name);
        return (
          fromRecipe !== undefined &&
          JSON.stringify(fromRecipe.tokens?.colors) !== JSON.stringify(theme.tokens?.colors)
        );
      })
      .map((theme) => theme.name);

    expect(orphans).toEqual([]);
  });

  it("the neutral baseline is generated too, not hand-authored", () => {
    for (const theme of getNeutralThemes()) {
      expect(theme.meta?.generation?.algorithm, theme.name).toBe("semantic-v2");
      expect(theme.meta?.generation?.seed, theme.name).toBeTruthy();
    }
  });
});

describe("recipes express identity, not resolved tokens", () => {
  it("contains no resolved colour literals", () => {
    // A recipe may name a *seed*. It must never name `mutedForeground`. This is
    // the rule that keeps a preset from silently becoming a hand-authored theme.
    //
    // Three keys legitimately carry a hex:
    //   `seed`       — the identity input
    //   `brandColor` — the documented brand colour
    //   `color`      — a value inside the brand *reference* data, which is a
    //                  citation of what the brand publishes, not a token
    //
    // Anything else means a resolved token leaked into a recipe.
    const offenders: string[] = [];

    for (const file of RECIPE_FILES) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/#[0-9a-fA-F]{6}/g)) {
        const lineStart = source.lastIndexOf("\n", match.index ?? 0) + 1;
        const lineEnd = source.indexOf("\n", match.index ?? 0);
        const line = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

        if (!/\b(seed|brandColor|color):/.test(line)) {
          offenders.push(`${file.split(/[\\/]/).pop()}: ${line.trim()}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("declares exactly one seed per recipe, plus an optional brand colour", () => {
    for (const recipe of [...DEFAULT_PRESET_RECIPES, ...BRAND_PRESET_RECIPES]) {
      expect(recipe.seed, recipe.id).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(recipe.kind === "brand" ? recipe.metadata?.provenance : "n/a", recipe.id).toBeTruthy();
    }
  });

  it("every recipe produces a full, valid theme in both modes", () => {
    for (const recipe of [...DEFAULT_PRESET_RECIPES, ...BRAND_PRESET_RECIPES]) {
      for (const mode of ["light", "dark"] as const) {
        const theme = buildPresetTheme(recipe, mode);
        const colors = colorsOf(theme);
        expect(Object.keys(colors).length, `${recipe.id}/${mode}`).toBe(21);
        for (const [role, value] of Object.entries(colors)) {
          expect(value, `${recipe.id}/${mode}.${role}`).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });
});

describe("generated themes are already contrast-normalized", () => {
  it("is a no-op under ensureReadableContrast", () => {
    // The invariant: `generateTheme()` returns a *complete* semantic solution,
    // not a semi-valid theme that a runtime repair rescues. `getBuiltInThemes()`
    // runs `ensureReadableContrast` over everything it assembles; for a generated
    // theme that repair must change nothing. If it ever does, the generator has
    // regressed and the safety net is hiding it.
    const shipped = new Map(getBuiltInThemes().map((theme) => [theme.name, theme]));

    for (const theme of [...getPresetThemes(), ...getBrandPresets(), ...getNeutralThemes()]) {
      expect(shipped.get(theme.name), `${theme.name} missing from the shipped set`).toEqual(theme);
    }
  });
});

describe("the preset catalog is derived, not authored", () => {
  it("describes every recipe", () => {
    expect(getPresetCatalog()).toHaveLength(
      DEFAULT_PRESET_RECIPES.length + BRAND_PRESET_RECIPES.length,
    );
    expect(getPresetCatalog("default")).toHaveLength(DEFAULT_PRESET_RECIPES.length);
    expect(getPresetCatalog("brand")).toHaveLength(BRAND_PRESET_RECIPES.length);
  });

  it("carries identity, provenance and quality for each entry", () => {
    for (const entry of getPresetCatalog()) {
      expect(entry.id).toBeTruthy();
      expect(entry.family).toBeTruthy();
      expect(entry.seed).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.algorithm).toBe("semantic-v2");
      expect(["warm", "cool", "neutral"]).toContain(entry.temperature);
      expect(entry.character).toBeTruthy();
      expect(entry.modes).toEqual(["light", "dark"]);
      expect(entry.quality.total).toBe(9);
    }
  });

  it("reports quality from the same scorecard the gate uses", () => {
    for (const entry of getPresetCatalog()) {
      // The catalog must agree with a direct score of the same themes.
      expect(entry.quality.checks).toHaveLength(9);
      for (const mode of ["light", "dark"] as const) {
        expect(scoreTheme(entry.themes[mode]).total).toBe(entry.quality.total);
      }
      // Phase 7 left the preset matrix clean; the catalog must reflect that.
      expect(entry.quality.failures, entry.id).toEqual([]);
      expect(entry.quality.passed, entry.id).toBe(entry.quality.total);
    }
  });

  it("records provenance for brand entries only", () => {
    for (const entry of getPresetCatalog("brand")) {
      expect(entry.provenance, entry.id).toBe("approximate");
      expect(entry.brandColor, entry.id).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    for (const entry of getPresetCatalog("default")) {
      expect(entry.provenance, entry.id).toBeUndefined();
    }
  });
});
