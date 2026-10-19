/**
 * Perceptual comparison between colors.
 *
 * These are what the relationship checks (theme-generation.md Phase 5) use to
 * answer "is `accent` too close to `primary`?" in perceptual terms rather than
 * by comparing hex strings.
 *
 * @packageDocumentation
 */
import { normalizeHue, oklchToOklab } from "./convert";
import type { Oklab, Oklch } from "./types";

/**
 * Euclidean distance between two OKLab colors (ΔE_Ok).
 *
 * Roughly: `< 0.02` is imperceptible, `0.02…0.05` is a subtle difference,
 * `> 0.1` reads as clearly different colors. The scale is documented here
 * because the relationship thresholds are expressed in it.
 *
 * @param a - One color.
 * @param b - The other color.
 * @returns A non-negative distance.
 */
export function deltaEOk(a: Oklab, b: Oklab): number {
  const dl = a.l - b.l;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/** ΔE_Ok between two OKLCH colors. */
export function deltaEOklch(a: Oklch, b: Oklch): number {
  return deltaEOk(oklchToOklab(a), oklchToOklab(b));
}

/**
 * The circular distance between two hue angles, in `0…180` degrees.
 *
 * Handles wraparound: 350° and 10° are 20° apart, not 340°.
 *
 * @param a - A hue angle.
 * @param b - A hue angle.
 * @returns The shortest angular distance, `0…180`.
 */
export function hueDistance(a: number, b: number): number {
  const raw = Math.abs(normalizeHue(a) - normalizeHue(b));
  return raw > 180 ? 360 - raw : raw;
}

/**
 * Perceptual distance between two semantic roles.
 *
 * Currently ΔE_Ok; named separately so the relationship checks express intent
 * ("how far apart are these roles?") rather than the metric.
 */
export function roleDistance(a: Oklch, b: Oklch): number {
  return deltaEOklch(a, b);
}

/**
 * A `0…1` similarity score for two roles, where `1` is identical.
 *
 * `1 / (1 + 10·ΔE_Ok)` — a monotonic squash of {@link roleDistance} that is
 * convenient for thresholding ("similarity above 0.5 means they collide").
 * It is a heuristic, not a perceptual constant; the relationship checks treat it
 * as one signal among several.
 */
export function roleSimilarity(a: Oklch, b: Oklch): number {
  return 1 / (1 + 10 * roleDistance(a, b));
}
