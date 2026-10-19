/**
 * `generateTheme` — the public generation entry point.
 *
 * Since Themvora 2.x this is a thin adapter over the internal pipeline
 * (`../generation`): it derives an identity from the seed, runs the role
 * generators, enforces the visual relationships, solves contrast, and emits the
 * frozen `ThemeDefinition` shape. It holds no color math of its own —
 * theme-generation.md §1's "one engine" rule.
 *
 * The public signature is unchanged: `{ seed, family, withCode }` behaves
 * exactly as it did. `style`, `contrast` and `algorithm` are additive and
 * optional.
 *
 * @packageDocumentation
 */
import { ColorError, oklchToHexMapped } from "./color";
import { createDiagnostic } from "./diagnostics";
import { ThemeError } from "./errors";
import {
  deriveIdentity,
  generateCodeTokens,
  generateRolePalette,
  GENERATION_ALGORITHM,
  resolveGenerationAlgorithm,
  resolveStyle,
  type GenerationStyle,
  type Palette,
  type ThemeIdentity,
} from "./generation";
import { DEFAULT_CONTRAST_CONTRACT } from "./generation/contract";
import { GENERATED_THEME_KIND } from "./generated-theme";
import { CORE_COLORS } from "./model/semantic-roles";
import { defineTheme, type ThemeDefinition } from "./model";
import type { GenerationMeta } from "./model/meta";
import type { ThemeColors } from "./model/tokens";

/**
 * Options for {@link generateTheme}.
 */
export interface GenerateThemeOptions {
  /** Hex color seed (e.g. `"#d97706"`) that drives the generated palette. */
  seed: string;
  /**
   * Theme family name used for the generated themes' `meta.family` and names.
   * @defaultValue `"generated"`
   */
  family?: string;
  /**
   * Also generate a `tokens.code` block (syntax-highlighting colors) alongside
   * the color tokens. Opt-in — most themes don't need code tokens.
   * @defaultValue `false`
   */
  withCode?: boolean;
  /**
   * Visual language to generate in. Omitted means `"balanced"`, which is the
   * behavior existing callers already get.
   *
   * @see {@link GenerationStyle}
   */
  style?: GenerationStyle;
  /**
   * Contrast level to solve for. Only `"AA"` is implemented; it is also the
   * default, so omitting this changes nothing. The type deliberately admits no
   * other value rather than accepting one and quietly ignoring it.
   *
   * @defaultValue `"AA"`
   */
  contrast?: "AA";
  /**
   * Generation algorithm to use. Omitted means the current algorithm. Present so
   * a caller can pin a shipped theme to the algorithm that produced it.
   *
   * @defaultValue the current algorithm
   */
  algorithm?: string;
}

/**
 * The light and dark themes produced by {@link generateTheme}.
 */
export interface GeneratedThemePair {
  /** The generated light theme. */
  light: ThemeDefinition;
  /** The generated dark theme. */
  dark: ThemeDefinition;
}

/** Capitalise the first character of a family name. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Derive the seed identity, converting the color engine's `ColorError` into the
 * public `TV_GENERATION_INVALID_SEED` diagnostic.
 */
function resolveSeedIdentity(seed: string): ThemeIdentity {
  try {
    return deriveIdentity(seed);
  } catch (error) {
    if (error instanceof ColorError) {
      throw ThemeError.fromDiagnostic(
        createDiagnostic({
          code: "TV_GENERATION_INVALID_SEED",
          level: "error",
          message: `generateTheme() received an invalid seed "${seed}".`,
          context: {
            api: "generateTheme",
            property: "seed",
            received: seed,
            expected: "a hex, rgb() or hsl() color",
          },
          hint: 'Pass a parseable color such as "#6366f1".',
          cause: error,
        }),
      );
    }
    throw error;
  }
}

/**
 * Convert a solved OKLCH palette to hex color tokens.
 *
 * Only the 21 core roles are emitted. `warning` / `info` / `error` are optional
 * capabilities (`model/semantic-roles.ts`) and are not fabricated — a value no
 * consumer reads is worse than an absent one, because it looks like support.
 */
function paletteToColors(palette: Palette): ThemeColors {
  const colors: Record<string, string> = {};
  for (const role of CORE_COLORS) {
    colors[role] = oklchToHexMapped(palette[role]);
  }
  return colors;
}

function buildGenerationMeta(
  seed: string,
  style: GenerationStyle | undefined,
): GenerationMeta {
  const meta: GenerationMeta = {
    kind: GENERATED_THEME_KIND,
    algorithm: GENERATION_ALGORITHM,
    seed,
    contrast: { ...DEFAULT_CONTRAST_CONTRACT },
  };
  if (style !== undefined) meta.style = style;
  return meta;
}

/**
 * Generate a cohesive light/dark theme pair from a single seed color.
 *
 * Light and dark are generated **independently** from the same identity — the
 * dark theme is not an inversion of the light one — so the brand hue survives
 * the mode change. Every semantic pair is solved to the contrast contract with a
 * safety margin before the theme is returned, and the seed is recorded in
 * `meta.generation` as provenance.
 *
 * @param options The seed color and generation options.
 * @returns A `{ light, dark }` pair of theme definitions sharing one family.
 * @throws {ColorError} When the seed is not a parseable color.
 * @throws {ThemeError} When an unsupported `algorithm` is requested.
 *
 * @example
 * ```ts
 * const { light, dark } = generateTheme({ seed: "#d97706", family: "brand" });
 * ```
 *
 * @see {@link validateTheme}
 * @see {@link defineTheme}
 */
export function generateTheme(options: GenerateThemeOptions): GeneratedThemePair {
  const seed = options.seed;
  const family = options.family ?? "generated";
  const name = options.family ?? "generated";

  // Resolving the algorithm first means an unsupported request fails before any
  // work is done, and an unparseable seed fails fast with a typed diagnostic.
  resolveGenerationAlgorithm(options.algorithm);

  const identity = resolveSeedIdentity(seed);
  const style = resolveStyle(options.style);
  const generation = buildGenerationMeta(seed, options.style);

  const lightRoles = generateRolePalette({ mode: "light", identity, style });
  const darkRoles = generateRolePalette({ mode: "dark", identity, style });

  const light = defineTheme({
    name: `${name}-light`,
    meta: {
      family,
      mode: "light",
      label: `${capitalize(family)} Light`,
      order: 10,
      generation,
    },
    tokens: {
      colors: paletteToColors(lightRoles.palette),
      radius: { lg: "8px" },
      ...(options.withCode ? { code: generateCodeTokens("light", identity) } : {}),
    },
  });

  const dark = defineTheme({
    name: `${name}-dark`,
    meta: {
      family,
      mode: "dark",
      label: `${capitalize(family)} Dark`,
      order: 20,
      generation,
    },
    tokens: {
      colors: paletteToColors(darkRoles.palette),
      radius: { lg: "8px" },
      ...(options.withCode ? { code: generateCodeTokens("dark", identity) } : {}),
    },
  });

  return { light, dark };
}
