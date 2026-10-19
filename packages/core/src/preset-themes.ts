/**
 * The curated default preset set.
 *
 * Since Phase 7 the presets are **generated**, not hand-authored. Each family is
 * a {@link ThemePresetRecipe} — a seed, a style and a radius — and the tokens are
 * resolved by the same `semantic-v2` pipeline that `generateTheme()` uses. That
 * means a shipped preset cannot fail the generator's own contrast or
 * relationship guarantees, because it *is* the generator's output.
 *
 * ```
 * recipe → semantic-v2 → relationship checks → contrast solver → overrides
 * ```
 *
 * @packageDocumentation
 */
import type { ThemeDefinition } from "./model";
import {
  buildPresetTheme,
  DEFAULT_PRESET_RECIPES,
  type PresetMode,
} from "./preset-recipes";
import { mergePresetTokens, type PresetFamily, type PresetOverrides, type PresetVariantOverride } from "./presets";

/**
 * Apply a caller's per-mode token overrides to a generated preset.
 *
 * Overrides are applied **after** generation and are never auto-repaired: they
 * are user control, not generator output. A curated override that breaks the
 * contract is the caller's to fix, and `validateTheme()` will report it.
 */
function applyVariantOverride<T extends ThemeDefinition>(
  theme: T,
  variant: PresetVariantOverride | undefined,
): T {
  if (!variant?.tokens) return theme;
  return {
    ...theme,
    tokens: mergePresetTokens(theme.tokens ?? {}, variant.tokens),
  };
}

/**
 * Build the curated preset theme set: a light and dark theme for each preset
 * color family (oat, berry, mint, citrus, cocoa, plum, iris, sky, graphite).
 *
 * Each preset is generated from a recipe — seed, style and radius — by the same
 * `semantic-v2` pipeline `generateTheme()` uses, so every preset already satisfies
 * the contrast contract and the visual relationship checks before it is returned.
 * Optional per-family, per-mode token overrides are applied on top, afterwards.
 *
 * @param overrides Optional per-family, per-mode token overrides.
 * @returns An array of preset theme definitions, one light and one dark per
 *   family.
 *
 * @example
 * ```ts
 * const themes = getPresetThemes({
 *   plum: { light: { tokens: { colors: { primary: "#6d28d9" } } } },
 * });
 * ```
 */
export function getPresetThemes(overrides?: PresetOverrides) {
  return DEFAULT_PRESET_RECIPES.flatMap((recipe) => {
    const familyOverrides = overrides?.[recipe.family as PresetFamily];
    const modes: PresetMode[] = ["light", "dark"];

    return modes.map((mode) =>
      applyVariantOverride(
        buildPresetTheme(recipe, mode),
        mode === "light" ? familyOverrides?.light : familyOverrides?.dark,
      ),
    );
  });
}
