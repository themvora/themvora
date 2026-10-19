/**
 * Identity — what the seed *means*, before any role is assigned.
 *
 * theme-generation.md §0: the seed is intent, not the theme. This module turns a
 * seed color into the stable facts the rest of generation reasons about: its
 * hue, its chroma, how light it is, and whether it reads warm, cool or neutral.
 *
 * The seed is preserved verbatim as provenance; the identity records the
 * *measured* properties of the resolved, gamut-mapped base.
 *
 * @packageDocumentation
 */
import { hexToOklchMapped, normalizeHue, type Oklch } from "../color";

/**
 * The perceived temperature of the seed hue.
 *
 * `neutral` covers both achromatic seeds (too little chroma for hue to mean
 * anything) and the green band, which sits between the warm and cool arcs.
 */
export type Temperature = "warm" | "cool" | "neutral";

/**
 * The resolved identity of a seed.
 */
export interface ThemeIdentity {
  /** The seed exactly as supplied — provenance, never repaired. */
  seed: string;
  /** The seed as OKLCH, gamut-mapped. */
  base: Oklch;
  /** Hue angle of the base, `0…360`. */
  hue: number;
  /** Chroma of the base. */
  chroma: number;
  /** Perceptual lightness of the base, `0…1`. */
  lightness: number;
  /** Perceived temperature. */
  temperature: Temperature;
  /** `true` when the seed has enough chroma for hue to be meaningful. */
  isChromatic: boolean;
}

/** Chroma at or above which a seed's hue is considered meaningful. */
const CHROMATIC_THRESHOLD = 0.02;

/**
 * Classify a hue as warm, cool or neutral.
 *
 * - warm: red → yellow-orange, `[330, 360) ∪ [0, 90)`
 * - cool: cyan → violet, `[180, 330)`
 * - neutral: the green band between them, `[90, 180)`
 *
 * @param hue - Hue angle in degrees.
 * @param chroma - Chroma; below {@link CHROMATIC_THRESHOLD} the result is `neutral`.
 * @returns The temperature.
 */
export function temperatureOf(hue: number, chroma: number): Temperature {
  if (chroma < CHROMATIC_THRESHOLD) return "neutral";
  const h = normalizeHue(hue);
  if (h >= 330 || h < 90) return "warm";
  if (h >= 180) return "cool";
  return "neutral";
}

/**
 * Derive the identity of a seed color.
 *
 * @param seed - A CSS color string.
 * @returns The resolved identity.
 * @throws {ColorError} When the seed cannot be parsed.
 */
export function deriveIdentity(seed: string): ThemeIdentity {
  const base = hexToOklchMapped(seed);
  return {
    seed,
    base,
    hue: base.h,
    chroma: base.c,
    lightness: base.l,
    temperature: temperatureOf(base.h, base.c),
    isChromatic: base.c >= CHROMATIC_THRESHOLD,
  };
}
