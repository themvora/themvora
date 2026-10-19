/**
 * The brand-inspired preset set.
 *
 * Since Phase 7 the brand presets are **generated** from
 * `BRAND_PRESET_RECIPES`, exactly like the default presets. The brand's
 * signature colour anchors the identity; the surrounding semantic system —
 * surfaces, neutrals, borders, status colours — is produced by the same rules as
 * any other theme and contrast-solved before it ships.
 *
 * The brand stays recognizable because the *hue* is the brand's and the primary
 * is anchored to it. Individual tokens are allowed to differ from the brand's own
 * palette where readability requires it — see `preset-recipes/brands.ts`.
 *
 * @packageDocumentation
 */
import { buildPresetTheme, BRAND_PRESET_RECIPES, type PresetMode } from "./preset-recipes";

/**
 * Build the brand preset theme set: a light and dark theme for each brand
 * (Apple, GitHub, Vercel, Slack, Discord).
 *
 * @returns An array of brand theme definitions, one light and one dark per
 *   brand.
 */
export function getBrandPresets() {
  const modes: PresetMode[] = ["light", "dark"];
  return BRAND_PRESET_RECIPES.flatMap((recipe) =>
    modes.map((mode) => buildPresetTheme(recipe, mode)),
  );
}
