/**
 * Origin-aware save format selection.
 *
 * Chooses the best serialization format based on a theme's origin:
 * - Generated themes → `ts-generate` (preserves seed and options)
 * - Catalog themes → `ts-preset` (preserves catalog reference)
 * - Custom definitions → `ts` or `json` (preserves literal values)
 *
 * The format is a suggestion, not a mandate: the UI may override it, but the
 * default should match the theme's provenance to preserve the most information.
 *
 * @packageDocumentation
 */

import type { ThemeDefinition } from "@themvora/core";

import type { ThemeFileFormat } from "../services/saveTheme.js";

/** The origin of a theme, as detected from inspection. */
export type ThemeOrigin = "definition" | "generated" | "catalog";

/**
 * Suggest the best save format for a theme based on its origin.
 *
 * @param origin - The theme's origin, when known.
 * @param hasGenerateOptions - Whether the theme has generation options recorded.
 * @returns The suggested format.
 */
export function suggestSaveFormat(
  origin: ThemeOrigin | undefined,
  hasGenerateOptions: boolean,
): ThemeFileFormat {
  // Generated themes with options should use ts-generate to preserve the recipe
  if (origin === "generated" || hasGenerateOptions) {
    return "ts-generate";
  }

  // Catalog themes should use ts-preset to preserve the catalog reference
  if (origin === "catalog") {
    return "ts-preset";
  }

  // Custom definitions default to TypeScript for type safety
  if (origin === "definition") {
    return "ts";
  }

  // Unknown origin defaults to JSON for maximum compatibility
  return "json";
}

/**
 * Detect the origin of a theme from its metadata.
 *
 * @param theme - The theme to inspect.
 * @returns The detected origin, or undefined when it cannot be determined.
 */
export function detectThemeOrigin(theme: ThemeDefinition): ThemeOrigin | undefined {
  // Generated themes have a generation record in metadata
  if (theme.meta?.generation !== undefined) {
    return "generated";
  }

  // Catalog themes have a family that matches a known catalog
  // This is a heuristic: we check if the family is one of the catalog families
  const family = theme.meta?.family;
  if (family !== undefined && isCatalogFamily(family)) {
    return "catalog";
  }

  // If we can't determine the origin, assume it's a custom definition
  return "definition";
}

/**
 * Check whether a family name belongs to the canonical catalog.
 *
 * This is a heuristic based on known catalog families. A more robust approach
 * would query the catalog directly, but that requires async I/O.
 *
 * @param family - The family name to check.
 * @returns True when the family is a known catalog family.
 */
function isCatalogFamily(family: string): boolean {
  // Known catalog families from @themvora/core
  const catalogFamilies = new Set([
    "oat",
    "midnight",
    "sunset",
    "forest",
    "ocean",
    "rose",
    "slate",
    "zinc",
    "neutral",
    "stone",
  ]);
  return catalogFamilies.has(family);
}

/**
 * Validate that a save format is compatible with the theme's content.
 *
 * Some formats cannot represent certain theme features:
 * - `ts-generate` requires a seed in the theme's generation metadata
 * - `ts-preset` requires the theme to be from a catalog
 * - `css` loses all metadata and provenance
 *
 * @param format - The format to validate.
 * @param themes - The themes to be saved.
 * @returns An error message when incompatible, or undefined when valid.
 */
export function validateSaveFormat(
  format: ThemeFileFormat,
  themes: readonly ThemeDefinition[],
): string | undefined {
  if (themes.length === 0) {
    return "No themes to save.";
  }

  const primary = themes[0]!;

  if (format === "ts-generate") {
    const seed = primary.meta?.generation?.seed;
    if (typeof seed !== "string") {
      return "The ts-generate format requires a seed in the theme's generation metadata. Use ts or json instead.";
    }
  }

  if (format === "ts-preset") {
    const origin = detectThemeOrigin(primary);
    if (origin !== "catalog") {
      return "The ts-preset format is only for catalog themes. Use ts or json for custom themes.";
    }
  }

  return undefined;
}

/**
 * Build a payload for ts-generate format from a theme's generation metadata.
 *
 * @param theme - The theme to extract options from.
 * @returns The payload, or undefined when the theme has no generation metadata.
 */
export function buildGeneratePayload(
  theme: ThemeDefinition,
): { seed: string; family?: string; style?: string; withCode: boolean } | undefined {
  const generation = theme.meta?.generation;
  if (generation === undefined) {
    return undefined;
  }

  const seed = generation.seed;
  if (typeof seed !== "string") {
    return undefined;
  }

  return {
    seed,
    ...(theme.meta?.family === undefined ? {} : { family: theme.meta.family }),
    ...(generation.style === undefined ? {} : { style: generation.style }),
    withCode: theme.tokens?.code !== undefined,
  };
}

/**
 * Build a payload for ts-preset format from a theme's metadata.
 *
 * @param theme - The theme to extract options from.
 * @returns The payload, or undefined when the theme is not from a catalog.
 */
export function buildPresetPayload(
  theme: ThemeDefinition,
): { presetSource: "preset" | "brand" | "builtin"; family?: string } | undefined {
  const origin = detectThemeOrigin(theme);
  if (origin !== "catalog") {
    return undefined;
  }

  // Default to "preset" unless we can determine otherwise
  // In practice, the inspection should record the exact catalog source
  return {
    presetSource: "preset",
    ...(theme.meta?.family === undefined ? {} : { family: theme.meta.family }),
  };
}
