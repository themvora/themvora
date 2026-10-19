/**
 * The neutral scale.
 *
 * Neutrals are derived from the seed's hue and temperature with deliberately
 * restrained chroma, so a warm seed produces warm grays and a blue seed produces
 * cool grays. This is what stops every theme sharing the same `#f5f5f5`
 * scaffold — theme-generation.md Phase 2's "no flat neutral" requirement.
 *
 * @packageDocumentation
 */
import { normalizeHue, type Oklch } from "../color";
import type { ThemeIdentity } from "./identity";
import type { PaletteContext } from "./types";

/**
 * The hue the neutral scale is tinted with.
 *
 * An achromatic seed has no meaningful hue, so the neutral scale is a true gray.
 */
export function neutralHue(identity: ThemeIdentity): number {
  return identity.isChromatic ? normalizeHue(identity.hue) : 0;
}

/**
 * The chroma of the neutral scale, after the style's tint strength.
 *
 * `multiplier` lets a specific surface be tinted more than the baseline (a
 * `muted` surface can carry more of the hue than `background`).
 */
export function neutralChroma(ctx: PaletteContext, multiplier = 1): number {
  if (!ctx.identity.isChromatic) return 0;
  return ctx.style.surfaceChroma * ctx.style.neutralTemperature * multiplier;
}

/** A neutral color at a given lightness. */
export function neutral(ctx: PaletteContext, lightness: number, multiplier = 1): Oklch {
  return {
    l: lightness,
    c: neutralChroma(ctx, multiplier),
    h: neutralHue(ctx.identity),
  };
}
