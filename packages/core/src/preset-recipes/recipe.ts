/**
 * Preset recipes — the design intent behind a shipped preset.
 *
 * ## The rule
 *
 * **Recipes specify identity; generated themes specify resolved implementation.**
 *
 * A recipe says "a warm, soft, oat-coloured theme". It does not say what
 * `mutedForeground` is. The pipeline decides that, and the pipeline is the same
 * one `generateTheme()` uses — so a preset can never drift from the generator's
 * own contrast and relationship guarantees.
 *
 * ```
 * curated recipe
 *        ↓
 *   semantic-v2  (identity → role palettes)
 *        ↓
 *   relationship checks  (surfaces, border band, input/ring)
 *        ↓
 *   contrast solver
 *        ↓
 *   recipe overrides      (curated exceptions, never auto-repaired)
 *        ↓
 *   frozen preset output
 * ```
 *
 * This type deliberately reuses {@link ThemeTokens} rather than introducing a
 * parallel theme abstraction: a recipe's overrides are exactly the token shape a
 * theme already has.
 *
 * @packageDocumentation
 */
import { hexToOklchMapped, oklchToHexMapped, type Oklch } from "../color";
import {
  DEFAULT_CONTRAST_CONTRACT,
  deriveIdentity,
  generateRolePalette,
  GENERATION_ALGORITHM,
  resolveStyle,
  type GenerationStyle,
} from "../generation";
import { defineTheme, type ThemeDefinition } from "../model";
import type { GenerationMeta } from "../model/meta";
import { CORE_COLORS, type CoreColor } from "../model/semantic-roles";
import type { ThemeTokens } from "../model/tokens";
import { mergePresetTokens } from "../presets";
import { anchorsFor, type BrandSource, type ResolvedAnchor } from "./brand-source";

/** A generation mode. */
export type PresetMode = "light" | "dark";

/**
 * Token overrides applied **after** generation.
 *
 * These are curated exceptions, not corrections. They are never auto-repaired —
 * if a curated override breaks the contrast contract, `validateTheme()` reports
 * it and the preset author fixes the recipe. Silently rewriting a curated value
 * would make the recipe a lie.
 */
export type ThemeTokenOverrides = Partial<ThemeTokens>;

/**
 * Per-mode recipe detail.
 */
export interface PresetVariantRecipe {
  /** Overrides the recipe seed for this mode only. */
  seed?: string;
  /** Token overrides applied after generation, for this mode. Never repaired. */
  overrides?: ThemeTokenOverrides;
}

/** Whether a recipe is a curated default or a brand-inspired starting point. */
export type PresetKind = "default" | "brand";

/**
 * How faithful a brand recipe is to the real brand.
 *
 * Required on brand recipes: a preset gallery that shows a company's colours
 * without saying how it relates to the company is misleading.
 */
export type BrandProvenance =
  | "official"
  | "approximate"
  | "community-inspired"
  | "demonstration-only"
  | "unaffiliated";

/** Descriptive metadata for a recipe. */
export interface PresetRecipeMetadata {
  /** One-line description of the visual character. */
  description?: string;
  /** Free-form tags. */
  tags?: string[];
  /** How faithful the recipe is to the real brand. Brand recipes only. */
  provenance?: BrandProvenance;
  /** The official brand colour this recipe approximates, for documentation. */
  brandColor?: string;
}

/**
 * A preset recipe: identity, style, and curated exceptions.
 */
export interface ThemePresetRecipe {
  /** Stable identifier, e.g. `"oat"`. */
  id: string;
  /** Display name, e.g. `"Oat"`. */
  name: string;
  /** Theme family used for selection, e.g. `"oat"`. */
  family: string;
  /** Curated default, or brand-inspired. */
  kind: PresetKind;
  /** The seed that anchors the palette. */
  seed: string;
  /** The generation style. Omitted means `balanced`. */
  style?: GenerationStyle;
  /** Border radius for the `radius.lg` token. */
  radius?: string;
  /** Light-mode detail. */
  light?: PresetVariantRecipe;
  /** Dark-mode detail. */
  dark?: PresetVariantRecipe;
  /** Descriptive metadata. */
  metadata?: PresetRecipeMetadata;
  /**
   * The brand reference material this recipe is built from.
   *
   * Brand recipes only. It records where each colour came from, whether it is
   * official, and how the generator treats it — which is what lets the preset
   * say "the identity comes from the real brand palette" truthfully, and lets
   * the page show exactly which values were preserved and which were derived.
   */
  brand?: BrandSource;
}

/** The radius used when a recipe does not specify one. */
const DEFAULT_RADIUS = "8px";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * A built preset plus the provenance needed to explain it.
 */
export interface BuiltPresetTheme {
  /** The generated, contrast-solved theme. */
  theme: ThemeDefinition;
  /** The brand anchors pinned in this mode. Empty for a non-brand recipe. */
  anchors: ResolvedAnchor[];
  /**
   * Anchors the solver moved to satisfy the contract.
   *
   * This is the accessibility normalization: the brand identity is preserved
   * *unless* keeping it exactly would have broken a contract pair, and when that
   * happens it is reported rather than hidden.
   */
  normalized: Array<{ role: string; anchor: string; resolved: string; label: string }>;
}

/**
 * Build one mode of a preset, with its anchor provenance.
 *
 * @param recipe - The recipe.
 * @param mode - Which mode to build.
 * @returns The theme plus the anchor report.
 * @throws {ColorError} When the recipe's seed is not a parseable color.
 */
export function buildPresetThemeReport(
  recipe: ThemePresetRecipe,
  mode: PresetMode,
): BuiltPresetTheme {
  const variant = mode === "light" ? recipe.light : recipe.dark;
  const seed = variant?.seed ?? recipe.seed;

  const identity = deriveIdentity(seed);
  const style = resolveStyle(recipe.style);

  // Pin the brand's published values. Only ANCHOR-classified colours with a
  // Themvora role are pinned; everything else is generated around them.
  const anchors = recipe.brand ? anchorsFor(recipe.brand, mode) : [];
  const pinned: Partial<Record<string, Oklch>> = {};
  for (const anchor of anchors) {
    try {
      pinned[anchor.role] = hexToOklchMapped(anchor.color);
    } catch {
      // An unparseable anchor is a recipe bug, not a runtime condition. The
      // brand-reference audit fails on it; generation carries on without it.
    }
  }

  const ctx = {
    mode,
    identity,
    style,
    ...(Object.keys(pinned).length > 0 ? { anchors: pinned as Partial<Record<CoreColor, Oklch>> } : {}),
  };

  const { palette, anchorAdjustments } = generateRolePalette(ctx);

  const colors: Record<string, string> = {};
  for (const role of CORE_COLORS) {
    colors[role] = oklchToHexMapped(palette[role]);
  }

  const baseTokens: ThemeTokens = {
    colors,
    radius: { lg: recipe.radius ?? DEFAULT_RADIUS },
  };

  // `mergePresetTokens` keeps the token shape identical to a hand-authored preset.
  const tokens = mergePresetTokens(baseTokens, variant?.overrides);

  // Record the pinned roles so a downstream audit can tell a brand anchor from a
  // generated value without re-deriving the recipe.
  const anchoredRoles = anchors.map((anchor) => anchor.role);

  const generation: GenerationMeta = {
    algorithm: GENERATION_ALGORITHM,
    seed,
    contrast: { ...DEFAULT_CONTRAST_CONTRACT },
    ...(recipe.style !== undefined ? { style: recipe.style } : {}),
    ...(anchoredRoles.length > 0 ? { anchored: anchoredRoles } : {}),
  };

  const theme = defineTheme({
    name: `${recipe.family}-${mode}`,
    meta: {
      family: recipe.family,
      mode,
      label: `${recipe.name} ${capitalize(mode)}`,
      order: mode === "light" ? 10 : 20,
      ...(recipe.metadata?.description !== undefined
        ? { description: recipe.metadata.description }
        : {}),
      ...(recipe.metadata?.tags !== undefined ? { tags: [...recipe.metadata.tags] } : {}),
      generation,
    },
    tokens,
  });

  const labelOf = (role: string) =>
    anchors.find((anchor) => anchor.role === role)?.label ?? role;

  return {
    theme,
    anchors,
    normalized: anchorAdjustments.map((adjustment) => ({
      role: adjustment.role,
      anchor: oklchToHexMapped(adjustment.anchor),
      resolved: oklchToHexMapped(adjustment.resolved),
      label: labelOf(adjustment.role),
    })),
  };
}

/**
 * Build one mode of a preset from its recipe.
 *
 * @param recipe - The recipe.
 * @param mode - Which mode to build.
 * @returns The generated, contrast-solved theme definition.
 * @throws {ColorError} When the recipe's seed is not a parseable color.
 */
export function buildPresetTheme(recipe: ThemePresetRecipe, mode: PresetMode): ThemeDefinition {
  return buildPresetThemeReport(recipe, mode).theme;
}

/**
 * Build both modes of a preset from its recipe.
 *
 * Light and dark are generated independently from the same identity, so the
 * brand hue survives the mode change rather than being inverted.
 *
 * @param recipe - The recipe.
 * @returns `[light, dark]`.
 */
export function buildPresetPair(recipe: ThemePresetRecipe): [ThemeDefinition, ThemeDefinition] {
  return [buildPresetTheme(recipe, "light"), buildPresetTheme(recipe, "dark")];
}
