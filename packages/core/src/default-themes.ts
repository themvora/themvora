/**
 * The six-family default theme set.
 *
 * This is the older, narrower sibling of {@link getPresetThemes}: same families,
 * same generated tokens, but only the six that predate `iris`, `sky` and
 * `graphite`.
 *
 * Since Phase 7 it is **generated from the same recipes** rather than carrying
 * its own hand-authored copy of the palette. Before, the two exports drifted:
 * `getDefaultThemes()` and `getPresetThemes()` described the same families with
 * different hex values, and nothing kept them in step. Delegating removes the
 * duplicate entirely.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition } from "./model";
import { buildPresetTheme, DEFAULT_PRESET_RECIPES } from "./preset-recipes";

/** The families this export covers. */
const DEFAULT_FAMILIES: ReadonlySet<string> = new Set([
  "oat",
  "berry",
  "mint",
  "citrus",
  "cocoa",
  "plum",
]);

/**
 * Build the default theme family set: a light and dark theme for each of the
 * original six built-in color families (oat, berry, mint, citrus, cocoa, plum).
 *
 * @returns An array of `ThemeDefinition` objects, one light and one dark per
 *   family, ready to be registered with a theme runtime.
 */
export function getDefaultThemes(): ThemeDefinition[] {
  return DEFAULT_PRESET_RECIPES.filter((recipe) => DEFAULT_FAMILIES.has(recipe.family)).flatMap(
    (recipe) => [buildPresetTheme(recipe, "light"), buildPresetTheme(recipe, "dark")],
  );
}
