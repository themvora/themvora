/**
 * OKLCH adjustment operations.
 *
 * These are the *only* place the codebase is allowed to change a color's
 * lightness, chroma or hue. Presets, adapters and the runtime call these rather
 * than re-implementing `lighten()`/`darken()`/`rotateHue()`, which is the
 * "no scattered color math" rule from theme-generation.md §1.
 *
 * @packageDocumentation
 */
import {
  CHROMA_EPSILON,
  clamp,
  isInGamut,
  normalizeHue,
  oklchToRgb,
} from "./convert";
import type { Oklch } from "./types";

/** Binary-search steps used by {@link gamutMapOklch}. 24 steps resolve chroma to ~6e-8. */
const GAMUT_SEARCH_STEPS = 24;

/** Clamp lightness into `0…1`. */
export function clampLightness(l: number): number {
  return clamp(l, 0, 1);
}

/** A copy of `lch` with lightness set to `l` (clamped). */
export function withLightness(lch: Oklch, l: number): Oklch {
  return { l: clamp(l, 0, 1), c: lch.c, h: lch.h };
}

/** A copy of `lch` with chroma set to `c` (floored at 0). */
export function withChroma(lch: Oklch, c: number): Oklch {
  return { l: lch.l, c: Math.max(0, c), h: lch.h };
}

/** A copy of `lch` with hue set to `h` (normalised into `[0, 360)`). */
export function withHue(lch: Oklch, h: number): Oklch {
  return { l: lch.l, c: lch.c, h: normalizeHue(h) };
}

/** A copy of `lch` with lightness shifted by `delta`. */
export function adjustLightness(lch: Oklch, delta: number): Oklch {
  return withLightness(lch, lch.l + delta);
}

/** A copy of `lch` with chroma shifted by `delta`. */
export function adjustChroma(lch: Oklch, delta: number): Oklch {
  return withChroma(lch, lch.c + delta);
}

/** A copy of `lch` with hue rotated by `degrees` (wraps around the wheel). */
export function rotateHue(lch: Oklch, degrees: number): Oklch {
  return withHue(lch, lch.h + degrees);
}

/** Whether a color has no meaningful hue. */
export function isAchromatic(lch: Oklch, epsilon = CHROMA_EPSILON): boolean {
  return lch.c < epsilon;
}

/**
 * Canonicalise a color into the engine's representation.
 *
 * Clamps lightness to `0…1`, floors chroma at `0`, and wraps hue into
 * `[0, 360)`. It does **not** search the gamut — that is {@link gamutMapOklch}'s
 * job. Keeping the two separate means "this value is malformed" and "this value
 * is a valid color that sRGB cannot show" stay distinguishable.
 *
 * @param lch - The color to canonicalise.
 * @returns A color with every channel in its canonical range.
 */
export function normalizeOklch(lch: Oklch): Oklch {
  const c = Math.max(0, lch.c);
  return {
    l: clamp(lch.l, 0, 1),
    c: c < CHROMA_EPSILON ? 0 : c,
    h: c < CHROMA_EPSILON ? 0 : normalizeHue(lch.h),
  };
}

/**
 * Bring a color into the sRGB gamut by reducing **chroma only**.
 *
 * Lightness and hue are the color's identity; chroma is the component sRGB
 * cannot always represent. Clipping RGB channels instead would shift both hue
 * and lightness, which is how "the brand blue turned slightly purple" happens.
 * So the chroma is binary-searched down until the color fits, leaving hue and
 * lightness untouched.
 *
 * @param lch - The color to map.
 * @returns A color inside the sRGB gamut.
 */
export function gamutMapOklch(lch: Oklch): Oklch {
  const base: Oklch = {
    l: clamp(lch.l, 0, 1),
    c: Math.max(0, lch.c),
    h: normalizeHue(lch.h),
  };

  if (base.c < CHROMA_EPSILON) return { l: base.l, c: 0, h: base.h };
  if (isInGamut(oklchToRgb(base))) return base;

  let low = 0;
  let high = base.c;
  for (let i = 0; i < GAMUT_SEARCH_STEPS; i += 1) {
    const mid = (low + high) / 2;
    if (isInGamut(oklchToRgb({ l: base.l, c: mid, h: base.h }))) low = mid;
    else high = mid;
  }

  return { l: base.l, c: low, h: base.h };
}

/**
 * Interpolate between two OKLCH colors.
 *
 * Lightness and chroma interpolate linearly; hue takes the **shortest arc** so
 * that mixing red and magenta does not sweep through green.
 *
 * @param a - The color at `t = 0`.
 * @param b - The color at `t = 1`.
 * @param t - Interpolation position, clamped to `0…1`.
 * @returns The interpolated color.
 */
export function mixOklch(a: Oklch, b: Oklch, t: number): Oklch {
  const amount = clamp(t, 0, 1);
  const hueDelta = shortestHueDelta(a.h, b.h);
  return {
    l: a.l + (b.l - a.l) * amount,
    c: a.c + (b.c - a.c) * amount,
    h: normalizeHue(a.h + hueDelta * amount),
  };
}

/** Signed shortest angular difference from `from` to `to`, in `-180…180`. */
export function shortestHueDelta(from: number, to: number): number {
  const raw = normalizeHue(to) - normalizeHue(from);
  if (raw > 180) return raw - 360;
  if (raw < -180) return raw + 360;
  return raw;
}
