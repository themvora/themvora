import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getBrandPresets,
  getBuiltInThemes,
  getNeutralThemes,
  getPresetThemes,
  scoreTheme,
  type ThemeDefinition,
} from "../src";
// The recipe construction API is internal by design; tests reach it directly.
import {
  buildPresetTheme,
  BRAND_PRESET_RECIPES,
  DEFAULT_PRESET_RECIPES,
  type ThemePresetRecipe,
} from "../src/preset-recipes";

/**
 * Phase 7.11 — generated preset snapshots.
 *
 * Freezes the output of `recipe → generator → preset` so CI can prove the chain
 * still produces what shipped. Without this, a change to the colour engine would
 * silently rewrite every preset in the gallery.
 *
 * Re-capture with `TV_CAPTURE_PRESETS=1`, and explain the diff in the Agent Log.
 * Never edit the fixture by hand.
 */

const DIR = join(import.meta.dirname, "__baseline__");
const FILE = join(DIR, "presets.generated.json");

function colorsOf(theme: ThemeDefinition): Record<string, string> {
  return (theme.tokens?.colors ?? {}) as Record<string, string>;
}

function snapshotTheme(theme: ThemeDefinition) {
  return {
    name: theme.name,
    family: theme.meta?.family ?? null,
    mode: theme.meta?.mode ?? null,
    colors: colorsOf(theme),
    radius: (theme.tokens?.radius ?? {}) as Record<string, string>,
  };
}

function snapshotRecipe(recipe: ThemePresetRecipe) {
  return {
    id: recipe.id,
    family: recipe.family,
    kind: recipe.kind,
    seed: recipe.seed,
    style: recipe.style ?? null,
    radius: recipe.radius ?? null,
    provenance: recipe.metadata?.provenance ?? null,
  };
}

function buildSnapshot() {
  return {
    note: "Phase 7 generated presets. Frozen so recipe → generator → snapshot drift fails CI.",
    recipes: [...DEFAULT_PRESET_RECIPES, ...BRAND_PRESET_RECIPES].map(snapshotRecipe),
    presets: getPresetThemes().map(snapshotTheme),
    brands: getBrandPresets().map(snapshotTheme),
    // The shipped set, for the preset audit's drift check.
    shippedThemes: getBuiltInThemes().map(snapshotTheme),
  };
}

describe("Phase 7 — generated preset snapshots", () => {
  it("reproduces the committed snapshot", () => {
    const current = buildSnapshot();

    if (process.env.TV_CAPTURE_PRESETS === "1") {
      mkdirSync(DIR, { recursive: true });
      writeFileSync(FILE, `${JSON.stringify(current, null, 2)}\n`, "utf8");
      return;
    }

    expect(existsSync(FILE), `missing ${FILE} — run with TV_CAPTURE_PRESETS=1`).toBe(true);
    expect(current).toEqual(JSON.parse(readFileSync(FILE, "utf8")));
  });

  it("builds every preset from its recipe, not from hand-authored tokens", () => {
    for (const recipe of DEFAULT_PRESET_RECIPES) {
      for (const mode of ["light", "dark"] as const) {
        expect(buildPresetTheme(recipe, mode)).toEqual(
          getPresetThemes().find((theme) => theme.name === `${recipe.family}-${mode}`),
        );
      }
    }
    for (const recipe of BRAND_PRESET_RECIPES) {
      for (const mode of ["light", "dark"] as const) {
        expect(buildPresetTheme(recipe, mode)).toEqual(
          getBrandPresets().find((theme) => theme.name === `${recipe.family}-${mode}`),
        );
      }
    }
  });

  it("ships a preset for every recipe, in both modes", () => {
    expect(getPresetThemes()).toHaveLength(DEFAULT_PRESET_RECIPES.length * 2);
    expect(getBrandPresets()).toHaveLength(BRAND_PRESET_RECIPES.length * 2);
  });

  it("records provenance for every brand recipe", () => {
    for (const recipe of BRAND_PRESET_RECIPES) {
      expect(recipe.metadata?.provenance, recipe.id).toBeDefined();
      expect(recipe.metadata?.brandColor, recipe.id).toBeDefined();
    }
  });

  it("scores every preset 9/9", () => {
    const scores = [...getPresetThemes(), ...getBrandPresets()].map(scoreTheme);
    const imperfect = scores.filter((score) => score.passed !== score.total);

    expect(
      imperfect.map((score) => `${score.name} ${score.passed}/${score.total}`),
    ).toEqual([]);
    expect(scores.every((score) => score.total === 9)).toBe(true);
  });

  it("records the generation provenance on every generated preset", () => {
    for (const theme of [...getPresetThemes(), ...getBrandPresets()]) {
      expect(theme.meta?.generation?.algorithm, theme.name).toBe("semantic-v2");
      expect(theme.meta?.generation?.seed, theme.name).toBeTruthy();
    }
  });
});
